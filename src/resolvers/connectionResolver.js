/* @flow */
/* eslint-disable no-param-reassign, no-use-before-define */

import type {
  ResolveParams,
  ConnectionResolveParams,
  composeWithConnectionOpts,
  connectionSortOpts,
  CursorDataType,
  GraphQLConnectionType,
} from '../definition';
import { Resolver, TypeComposer } from 'graphql-compose';
import { GraphQLInt } from 'graphql';
import { prepareConnectionType } from '../types/connectionType';
import { prepareSortType } from '../types/sortInputType';
import Cursor from '../types/cursorType';

export function prepareConnectionResolver(
  typeComposer: TypeComposer,
  opts: composeWithConnectionOpts
): Resolver {
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('First arg for Resolver connection() should be instance of TypeComposer');
  }

  if (!typeComposer.hasRecordIdFn()) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) should have recordIdFn. `
                  + 'This function returns ID from provided object.');
  }

  const countResolver = typeComposer.getResolver(opts.countResolverName);
  if (!countResolver) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) provided to composeWithConnection `
                  + `should have resolver with name '${opts.countResolverName}' `
                  + 'due opts.countResolverName.');
  }
  const countResolve = countResolver.composeResolve();

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
        type: Cursor,
        description: 'Forward pagination argument for returning at most first edges',
      },
      last: {
        type: GraphQLInt,
        description: 'Backward pagination argument for returning at most last edges',
      },
      before: {
        type: Cursor,
        description: 'Backward pagination argument for returning at most last edges',
      },
      ...additionalArgs,
      sort: {
        type: sortEnumType,
        defaultValue: sortEnumType.getValues()[0].value, // first enum used by default
        description: 'Sort argument for data ordering',
      },
    },
    resolve: async (resolveParams: ConnectionResolveParams) => {
      let countPromise;
      const { projection = {}, args = {} } = resolveParams;
      const findManyParams: ResolveParams = Object.assign(
        {},
        resolveParams,
        { args: {} } // clear this params in copy
      );
      const sortOptions: connectionSortOpts = args.sort;


      let filter = resolveParams.args.filter || {};
      const beginCursorData = cursorToData(args.after);
      if (beginCursorData) {
        filter = sortOptions.directionFilter(beginCursorData, filter, false);
      }
      const endCursorData = cursorToData(args.before);
      if (endCursorData) {
        filter = sortOptions.directionFilter(endCursorData, filter, true);
      }
      findManyParams.args.filter = filter;


      let first = parseInt(args.first, 10) || 0;
      const last = parseInt(args.last, 10) || 0;

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

      const limit = first;
      const skip = first - last;

      findManyParams.args.limit = limit + 1; // +1 document, to check next page presence
      if (skip > 0) {
        findManyParams.args.skip = skip;
      }

      findManyParams.args.sort = sortOptions.sortValue;
      findManyParams.projection = projection;
      sortOptions.uniqueFields.forEach(fieldName => {
        findManyParams.projection[fieldName] = true;
      });

findManyParams.projection['count'] = true;
findManyParams.projection['age'] = true;
findManyParams.projection['name'] = true;

      const hasPreviousPage = !!args.last && skip > 0;
      let hasNextPage = false; // will be requested +1 document, to check next page presence

      const filterDataForCursor = (record) => {
        const result = {};
        sortOptions.uniqueFields.forEach(fieldName => {
          result[fieldName] = record[fieldName];
        });
        return result;
      };

console.log(findManyParams.args);

      return Promise.all([findManyResolve(findManyParams), countPromise])
        .then(([recordList, count]) => {
          const edges = [];
          // if returned more than `limit` records, strip array and mark that exists next page
          if (recordList.length > limit) {
            hasNextPage = !!args.first;
            recordList = recordList.slice(0, limit);
          }
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
          result.edges = edges;
          result.count = count;

          // pageInfo may be extended, so set data gradually
          if (edges.length > 0) {
            result.pageInfo.startCursor = edges[0].cursor;
            result.pageInfo.endCursor = edges[edges.length - 1].cursor;
            result.pageInfo.hasPreviousPage = hasPreviousPage;
            result.pageInfo.hasNextPage = hasNextPage;
          }

          return result;
        });
    },
  });
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

export function cursorToData(cursor?: ?string): ?CursorDataType {
  if (cursor) {
    try {
      return JSON.parse(cursor) || null;
    } catch (err) {
      return null;
    }
  }
  return null;
}

export function dataToCursor(data: CursorDataType): string {
  return JSON.stringify(data);
}
