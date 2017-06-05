/* @flow */
/* eslint-disable no-param-reassign, no-use-before-define */

import { Resolver, TypeComposer } from 'graphql-compose';
import type {
  ResolveParams,
  ConnectionResolveParams,
  composeWithConnectionOpts,
  connectionSortOpts,
  connectionSortMapOpts,
  GraphQLConnectionType,
} from './definition';
import { prepareConnectionType } from './types/connectionType';
import { prepareSortType } from './types/sortInputType';
import CursorType from './types/cursorType';
import { cursorToData, dataToCursor } from './cursor';

export function prepareConnectionResolver<TSource, TContext>(
  typeComposer: TypeComposer,
  opts: composeWithConnectionOpts
): Resolver<TSource, TContext> {
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('First arg for prepareConnectionResolver() should be instance of TypeComposer');
  }

  if (!opts.countResolverName) {
    throw new Error(
      `TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection ` +
        'should have option `opts.countResolverName`.'
    );
  }
  const countResolver = typeComposer.getResolver(opts.countResolverName);
  if (!countResolver) {
    throw new Error(
      `TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection ` +
        `should have resolver with name '${opts.countResolverName}' ` +
        'due opts.countResolverName.'
    );
  }
  const countResolve = countResolver.getResolve();

  if (!opts.findResolverName) {
    throw new Error(
      `TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection ` +
        'should have option `opts.findResolverName`.'
    );
  }
  const findManyResolver = typeComposer.getResolver(opts.findResolverName);
  if (!findManyResolver) {
    throw new Error(
      `TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection ` +
        `should have resolver with name '${opts.findResolverName}' ` +
        'due opts.countResolverName.'
    );
  }
  const findManyResolve = findManyResolver.getResolve();

  const additionalArgs = {};
  if (findManyResolver.hasArg('filter')) {
    const filter = findManyResolver.getArg('filter');
    if (filter) {
      additionalArgs.filter = filter;
    }
  }

  const sortEnumType = prepareSortType(typeComposer, opts);

  return new Resolver({
    type: prepareConnectionType(typeComposer),
    name: 'connection',
    kind: 'query',
    args: {
      first: {
        type: 'Int',
        description: 'Forward pagination argument for returning at most first edges',
      },
      after: {
        type: CursorType,
        description: 'Forward pagination argument for returning at most first edges',
      },
      last: {
        type: 'Int',
        description: 'Backward pagination argument for returning at most last edges',
      },
      before: {
        type: CursorType,
        description: 'Backward pagination argument for returning at most last edges',
      },
      ...additionalArgs,
      sort: {
        type: sortEnumType,
        defaultValue: sortEnumType.getValues()[0].value,
        description: 'Sort argument for data ordering',
      },
    },
    // eslint-disable-next-line
    resolve: async (
      resolveParams: $Shape<ConnectionResolveParams<TSource, TContext>>
    ) => {
      let countPromise;
      let findManyPromise;
      const { projection = {}, args, rawQuery } = resolveParams;
      const findManyParams: $Shape<ResolveParams<TSource, TContext>> = {
        ...resolveParams,
      };

      let first = parseInt(args.first, 10) || 0;
      if (first < 0) {
        throw new Error('Argument `first` should be non-negative number.');
      }
      const last = parseInt(args.last, 10) || 0;
      if (last < 0) {
        throw new Error('Argument `last` should be non-negative number.');
      }

      const countParams: $Shape<ResolveParams<TSource, TContext>> = {
        ...resolveParams,
        rawQuery,
        args: {
          filter: { ...resolveParams.args.filter },
        },
      };

      if (projection.count) {
        countPromise = countResolve(countParams);
      } else if (!first && last) {
        countPromise = countResolve(countParams);
      } else {
        countPromise = Promise.resolve(0);
      }

      if (projection && projection.edges) {
        // combine top level projection
        // (maybe somebody add additional fields via resolveParams.projection)
        // and edges.node (record needed fields)
        // $FlowFixMe
        findManyParams.projection = { ...projection, ...projection.edges.node };
      } else {
        findManyParams.projection = { ...projection };
      }

      if (!first && last) {
        first = await countPromise;
        first = parseInt(first, 10) || 0;
      }

      let limit = last || first || 20;
      let skip = last > 0 ? first - last : 0;

      let prepareCursorData;
      const sortConfig: ?connectionSortOpts = findSortConfig(opts.sort, args.sort);
      if (sortConfig) {
        prepareRawQuery(resolveParams, sortConfig);
        findManyParams.rawQuery = resolveParams.rawQuery;
        sortConfig.cursorFields.forEach(fieldName => {
          findManyParams.projection[fieldName] = true;
        });

        prepareCursorData = record => {
          const result = {};
          sortConfig.cursorFields.forEach(fieldName => {
            result[fieldName] = record[fieldName];
          });
          return result;
        };
      } else {
        [limit, skip] = prepareLimitSkipFallback(resolveParams, limit, skip);

        let skipIdx = -1;
        // eslint-disable-next-line
        prepareCursorData = _ => {
          skipIdx += 1;
          return skip + skipIdx;
        };
      }

      findManyParams.args.limit = limit + 1; // +1 document, to check next page presence
      if (skip > 0) {
        findManyParams.args.skip = skip;
      }

      // pass findMany ResolveParams to top resolver
      resolveParams.findManyResolveParams = findManyParams;
      resolveParams.countResolveParams = countParams;

      // This allows to optimize and not actually call the findMany resolver
      // if only the count is projected
      if (projection.count && Object.keys(projection).length === 1) {
        findManyPromise = Promise.resolve([]);
      } else {
        findManyPromise = findManyResolve(findManyParams);
      }

      return Promise.all([findManyPromise, countPromise])
        .then(([recordList, count]) => {
          const edges = [];
          // transform record to object { cursor, node }
          recordList.forEach(record => {
            edges.push({
              cursor: dataToCursor(prepareCursorData(record)),
              node: record,
            });
          });
          return [edges, count];
        })
        .then(([edges, count]) => {
          const result = emptyConnection();
          result.edges = edges.length > limit ? edges.slice(0, limit) : edges;

          result.pageInfo = preparePageInfo(edges, args, limit, skip);
          result.count = count;

          return result;
        });
    },
  });
}

export function preparePageInfo(
  edges: Object[],
  args: {
    last?: ?number,
    first?: ?number,
  },
  limit: number,
  skip: number
) {
  const pageInfo = {
    startCursor: '',
    endCursor: '',
    hasPreviousPage: false,
    hasNextPage: false,
  };

  const hasExtraRecords = edges.length > limit;

  // pageInfo may be extended, so set data gradually
  if (edges.length > 0 && limit > 0) {
    pageInfo.startCursor = edges[0].cursor;
    if (hasExtraRecords) {
      pageInfo.endCursor = edges[limit - 1].cursor;
    } else {
      pageInfo.endCursor = edges[edges.length - 1].cursor;
    }
    pageInfo.hasPreviousPage = !!args.last && skip > 0;
    pageInfo.hasNextPage = !!args.first && hasExtraRecords;
  }

  return pageInfo;
}

export function prepareRawQuery(
  rp: $Shape<ConnectionResolveParams<*, *>>,
  sortConfig: connectionSortOpts
) {
  if (!rp.rawQuery) {
    rp.rawQuery = {};
  }

  const beginCursorData = cursorToData(rp.args.after);
  if (beginCursorData) {
    const r = sortConfig.afterCursorQuery(rp.rawQuery, beginCursorData, rp);
    if (r !== undefined) {
      rp.rawQuery = r;
    }
  }

  const endCursorData = cursorToData(rp.args.before);
  if (endCursorData) {
    const r = sortConfig.beforeCursorQuery(rp.rawQuery, endCursorData, rp);
    if (r !== undefined) {
      rp.rawQuery = r;
    }
  }
}

export function prepareLimitSkipFallback(
  rp: $Shape<ConnectionResolveParams<*, *>>,
  limit: number,
  skip: number
): [number, number] {
  let newLimit = limit;
  let newSkip = skip;

  let beforeSkip: number = 0;
  let afterSkip: number = 0;

  if (rp.args.before) {
    const tmp = cursorToData(rp.args.before);
    if (Number.isInteger(tmp)) {
      beforeSkip = parseInt(tmp, 10);
    }
  }
  if (rp.args.after) {
    const tmp = cursorToData(rp.args.after);
    if (Number.isInteger(tmp)) {
      afterSkip = parseInt(tmp, 10) + 1;
    }
  }

  if (beforeSkip && afterSkip) {
    const rangeLimit = beforeSkip - afterSkip;
    if (rangeLimit < 0) {
      newLimit = 0;
      newSkip = skip + afterSkip;
    } else if (rangeLimit < limit) {
      newLimit = rangeLimit;
      newSkip = skip + beforeSkip - rangeLimit;
    } else {
      newSkip = skip + afterSkip;
    }
  } else if (beforeSkip) {
    newSkip = skip - beforeSkip;
    if (newSkip < 0) {
      newSkip = 0;
      newLimit = limit;
      // offset 0, so limit should not exceed offset in cursor,
      // otherwise it returns again this record
      if (newLimit > beforeSkip) {
        newLimit = beforeSkip;
      }
    }
  } else if (afterSkip) {
    newSkip = afterSkip;
  }

  return [newLimit, newSkip];
}

export function emptyConnection(): GraphQLConnectionType {
  return {
    count: 0,
    edges: [],
    pageInfo: {
      startCursor: '',
      endCursor: '',
      hasPreviousPage: false,
      hasNextPage: false,
    },
  };
}

export function findSortConfig(configs: connectionSortMapOpts, val: mixed): ?connectionSortOpts {
  // Object.keys(configs).forEach(k => {  // return does not works in forEach as I want
  for (const k in configs) {
    if (configs[k].value === val) {
      return configs[k];
    }
  }

  // Yep, I know that it's now good comparision, but fast solution for now
  // Sorry but complex sort value should has same key ordering
  //   cause {a: 1, b: 2} != {b: 2, a: 1}
  // BTW this code will be called only if arg.sort setuped by hands
  //   if graphql provides arg.sort, then first for-loop (above) done all work
  const valStringified = JSON.stringify(val);
  for (const k in configs) {
    if (JSON.stringify(configs[k].value) === valStringified) {
      return configs[k];
    }
  }

  return undefined;
}
