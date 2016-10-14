/* @flow */
/* eslint-disable no-param-reassign, no-use-before-define */

import { GraphQLInt } from 'graphql';
import { Resolver, TypeComposer, omit } from 'graphql-compose';
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

export function prepareConnectionResolver(
  typeComposer: TypeComposer,
  opts: composeWithConnectionOpts
): Resolver {
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('First arg for prepareConnectionResolver() should be instance of TypeComposer');
  }

  if (!opts.countResolverName) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection `
                  + 'should have option `opts.countResolverName`.');
  }
  const countResolver = typeComposer.getResolver(opts.countResolverName);
  if (!countResolver) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection `
                  + `should have resolver with name '${opts.countResolverName}' `
                  + 'due opts.countResolverName.');
  }
  const countResolve = countResolver.getResolve();

  if (!opts.findResolverName) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection `
                  + 'should have option `opts.findResolverName`.');
  }
  const findManyResolver = typeComposer.getResolver(opts.findResolverName);
  if (!findManyResolver) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection `
                  + `should have resolver with name '${opts.findResolverName}' `
                  + 'due opts.countResolverName.');
  }
  const findManyResolve = findManyResolver.getResolve();

  const additionalArgs = {};
  if (findManyResolver.hasArg('filter')) {
    additionalArgs.filter = findManyResolver.getArg('filter');
  }

  const sortEnumType = prepareSortType(typeComposer, opts);

  return new Resolver({
    outputType: prepareConnectionType(typeComposer),
    name: 'connection',
    kind: 'query',
    args: {
      first: {
        type: GraphQLInt,
        description: 'Forward pagination argument for returning at most first edges',
      },
      after: {
        type: CursorType,
        description: 'Forward pagination argument for returning at most first edges',
      },
      last: {
        type: GraphQLInt,
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
    resolve: async (resolveParams: ConnectionResolveParams) => {
      let countPromise;
      const { projection = {}, args } = resolveParams;
      const findManyParams: ResolveParams = Object.assign(
        {},
        resolveParams,
      );

      const sortConfig: connectionSortOpts = findSortConfig(opts.sort, args.sort);

      prepareRawQuery(resolveParams, sortConfig);
      findManyParams.rawQuery = resolveParams.rawQuery;

      if (projection && projection.edges) {
        // $FlowFixMe
        findManyParams.projection = projection.edges.node || {};
      } else {
        findManyParams.projection = {};
      }
      sortConfig.cursorFields.forEach(fieldName => {
        findManyParams.projection[fieldName] = true;
      });

      let first = parseInt(args.first, 10) || 0;
      if (first < 0) {
        throw new Error('Argument `first` should be non-negative number.');
      }
      const last = parseInt(args.last, 10) || 0;
      if (last < 0) {
        throw new Error('Argument `last` should be non-negative number.');
      }

      // pass count ResolveParams to top resolver
      resolveParams.countResolveParams = {
        ...findManyParams,
        args: {
          filter: Object.assign({}, findManyParams.args.filter),
        },
      };
      if (projection.count) {
        countPromise = countResolve(resolveParams.countResolveParams);
      } else if (!first && last) {
        countPromise = countResolve(resolveParams.countResolveParams);
      } else {
        countPromise = Promise.resolve(0);
        // count resolver not called, so remove it from top params
        delete resolveParams.countResolveParams;
      }

      if (!first && last) {
        first = await countPromise;
        first = parseInt(first, 10) || 0;
      }

      const limit = last || first || 20;
      const skip = last > 0 ? first - last : 0;

      findManyParams.args.limit = limit + 1; // +1 document, to check next page presence
      if (skip > 0) {
        findManyParams.args.skip = skip;
      }

      // pass findMany ResolveParams to top resolver
      resolveParams.findManyResolveParams = Object.assign({}, findManyParams);

      const filterDataForCursor = (record) => {
        const result = {};
        sortConfig.cursorFields.forEach(fieldName => {
          result[fieldName] = record[fieldName];
        });
        return result;
      };

      return Promise.all([findManyResolve(resolveParams.findManyResolveParams), countPromise])
        .then(([recordList, count]) => {
          const edges = [];
          // transform record to object { cursor, node }
          recordList.forEach(record => {
            edges.push({
              cursor: dataToCursor(filterDataForCursor(record)),
              node: record,
            });
          });
          return [edges, count];
        })
        .then(([edges, count]) => {
          const result = emptyConnection();
          result.edges = edges.length > limit
            ? edges.slice(0, limit)
            : edges;

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
  rp: ResolveParams,
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

export function findSortConfig(
  configs: connectionSortMapOpts,
  val: mixed
): ?connectionSortOpts {
  const valStringified = JSON.stringify(val);

  // Object.keys(configs).forEach(k => {  // return does not works
  for (let k in configs) {
    const cfgVal = configs[k].value;
    if (cfgVal === val) {
      return configs[k];
    }

    // Yep, I know that it's now good comparision, but fast solution for now
    // Sorry but complex sort value should has same key ordering
    //   cause {a: 1, b: 2} != {b: 2, a: 1}
    // BTW this code will be called only if arg.sort setuped by hands
    //   if graphql provides arg.sort, then works above cfgVal === val comparision
    if (JSON.stringify(cfgVal) === valStringified) {
      return configs[k];
    }
  };
}
