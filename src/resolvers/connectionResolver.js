/* @flow */
/* eslint-disable no-param-reassign, no-use-before-define */

import type {
  ResolveParams,
  ConnectionResolveParams,
  composeWithConnectionOpts,
  connectionSortOpts,
  GraphQLConnectionType,
} from '../definition';
import { Resolver, TypeComposer } from 'graphql-compose';
import { GraphQLInt } from 'graphql';
import { prepareConnectionType } from '../types/connectionType';
import { prepareSortType } from '../types/sortInputType';
import CursorType from '../types/cursorType';
import { cursorToData, dataToCursor } from '../cursor';

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
  const countResolve = countResolver.composeResolve();

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
  const findManyResolve = findManyResolver.composeResolve();

  const additionalArgs = {};
  if (findManyResolver.hasArg('filter')) {
    additionalArgs.filter = findManyResolver.getArg('filter');
  }

  const sortEnumType = prepareSortType(typeComposer, opts);

  return new Resolver(typeComposer, {
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
        defaultValue: sortEnumType.getValues()[0].name, // first enum used by default
        description: 'Sort argument for data ordering',
      },
    },
    resolve: async (resolveParams: ConnectionResolveParams) => {
      let countPromise;
      const { projection = {}, args } = resolveParams;
      const findManyParams: ResolveParams = Object.assign(
        {},
        resolveParams,
        { args: {} } // clear this params in copy
      );
      let sortOptions: connectionSortOpts;
      if (typeof args.sort === 'string') {
        const sortValue = sortEnumType.parseValue(args.sort);
        if (sortValue) {
          sortOptions = sortValue;
        } else {
          sortOptions = {
            sortValue: {},
            uniqueFields: [],
            // $FlowFixMe
            directionFilter: filter => filter,
          };
        }
      } else {
        sortOptions = args.sort;
      }

      findManyParams.args.filter = prepareFilter(args);
      findManyParams.args.sort = sortOptions.sortValue;

      if (projection && projection.edges) {
        findManyParams.projection = projection.edges.node || {};
      }
      sortOptions.uniqueFields.forEach(fieldName => {
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

      if (projection.count) {
        countPromise = countResolve(findManyParams);
      } else if (!first && last) {
        countPromise = countResolve(findManyParams);
      } else {
        countPromise = Promise.resolve(0);
      }

      if (!first && last) {
        first = await countPromise;
        first = parseInt(first, 10) || 0;
      }

      const limit = last || first;
      const skip = last > 0 ? first - last : 0;

      findManyParams.args.limit = limit + 1; // +1 document, to check next page presence
      if (skip > 0) {
        findManyParams.args.skip = skip;
      }

      const filterDataForCursor = (record) => {
        const result = {};
        sortOptions.uniqueFields.forEach(fieldName => {
          result[fieldName] = record[fieldName];
        });
        return result;
      };

      return Promise.all([findManyResolve(findManyParams), countPromise])
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
  const pageInfo = {};

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

export function prepareFilter(
  args: {
    after?: string,
    before?: string,
    filter?: Object,
    sort: connectionSortOpts,
  }
) {
  let filter = args.filter || {};
  const beginCursorData = cursorToData(args.after);
  if (beginCursorData) {
    filter = args.sort.directionFilter(filter, beginCursorData, false);
  }
  const endCursorData = cursorToData(args.before);
  if (endCursorData) {
    filter = args.sort.directionFilter(filter, endCursorData, true);
  }

  return filter;
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
