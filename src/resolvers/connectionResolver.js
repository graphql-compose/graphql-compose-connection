/* @flow */
/* eslint-disable no-param-reassign, no-use-before-define */

import type {
  ExtendedResolveParams,
  composeWithConnectionOpts,
  connectionSortOpts,
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

  const countResolver = typeComposer.getResolver('count');
  if (!countResolver) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) should have 'count' resolver`);
  }

  const findManyResolver = typeComposer.getResolver('findMany');
  if (!findManyResolver) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) should have 'findMany' resolver`);
  }

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
        defaultValue: sortEnumType.getValues()[0].name, // first enum used by default
        description: 'Sort argument for data ordering',
      },
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const { projection = {}, args = {} } = resolveParams;
      const findManyParams = Object.assign({}, resolveParams, {
        args: {},
        projection: {},
      });
      const connSortOpts: connectionSortOpts = resolveParams.args.sort;

      const first = args.first;
      const last = args.last;

      const limit = last || first;
      const skip = (first - last) || 0;

      findManyParams.args.limit = limit + 1; // +1 document, to check next page presence
      if (skip > 0) {
        findManyParams.args.skip = skip;
      }

      let filter = findManyParams.args.filter;
      const beginCursorData = cursorToData(args.after);
      if (beginCursorData) {
        filter = connSortOpts.cursorToFilter(beginCursorData, filter);
      }
      const endCursorData = cursorToData(args.before);
      if (endCursorData) {
        filter = connSortOpts.cursorToFilter(endCursorData, filter);
      }
      findManyParams.args.filter = filter;

      findManyParams.args.skip = skip;
      // findManyParams.args.sort  // TODO
      // findManyParams.projection  // TODO

      let countPromise;
      if (projection.count) {
        countPromise = countResolver(resolveParams);
      }
      const findManyPromise = findManyResolver(findManyParams);
      const hasPreviousPage = skip > 0;
      let hasNextPage = false; // will be requested +1 document, to check next page presence

      return findManyPromise
        .then(recordList => {
          const edges = [];
          // if returned more than `limit` records, strip array and mark that exists next page
          if (recordList.length > limit) {
            hasNextPage = true;
            recordList = recordList.slice(0, limit - 1);
          }
          // transform record to object { cursor, node }
          recordList.forEach(record => {
            const id = typeComposer.getRecordId(record);
            edges.push({
              cursor: idToCursor(id),
              node: record,
            });
          });
          return edges;
        })
        .then(async (edges) => {
          const result = emptyConnection();

          // pass `edge` data
          result.edges = edges;

          // if exists countPromise, await it's data
          if (countPromise) {
            result.count = await countPromise;
          }

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

export function emptyConnection() {
  return {
    count: 0,
    edges: [],
    pageInfo: {
      startCursor: null,
      endCursor: null,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  };
}

export function idToCursor(id: string) {
  return id;
}

export function cursorToId(cursor: string) {
  return cursor;
}



var PREFIX = 'arrayconnection:';

/**
 * Creates the cursor string from an offset.
 */
export function offsetToCursor(offset: number): ConnectionCursor {
  return base64(PREFIX + offset);
}

/**
 * Rederives the offset from the cursor string.
 */
export function cursorToOffset(cursor: ConnectionCursor): number {
  return parseInt(unbase64(cursor).substring(PREFIX.length), 10);
}
