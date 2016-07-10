import { cursorToId, idToCursor, dotObject } from '../utils';
import { projectionCollection, projectionFixRenamed } from './projection';
import {
  getArgsFromOpts,
  getRenamedMongooseFields,
} from './commons';
import { connectionArgs } from 'graphql-relay';


/**
 * Helper to get an empty connection.
 */
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


export function getIdFromCursor(cursor) {
  if (cursor === undefined || cursor === null) {
    return null;
  }

  return cursorToId(cursor);
}


export function getByConnectionResolver(typeName, resolverOpts = {}) {
  const mongooseModel = Storage.MongooseModels.get(typeName);

  if (!mongooseModel) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`graphql-mongoose warn: could not find model '${typeName}' `
        + `for getByConnectionResolver. You should call populateModels(${typeName}).`);
    }
  }

  const args = {
    ...connectionArgs,
    ...getArgsFromOpts(typeName, resolverOpts),
  };

  const renamedFields = getRenamedMongooseFields(mongooseModel);
  const projectionFn = renamedFields
    ? projectionFixRenamed.bind(this, renamedFields)
    : projectionCollection;

  const resolve = async function(root, queryArgs = {}, context, info) {
    const { before, after, first, last, sort = { _id: 1 }, filter } = queryArgs;

    const begin = getIdFromCursor(after);
    const end = getIdFromCursor(before);

    const skip = (first - last) || 0;
    const limit = last || first;

    const selector = Object.assign({}, filter ? dotObject(filter) : null);
    if (begin) {
      selector._id = {};
      selector._id.$gt = begin;
    }

    if (end) {
      selector._id = {};
      selector._id.$lt = end;
    }

    if (mongooseModel) {
      const projFields = projectionFn(info);

      let count = 0;
      if (projFields.count) {
        count = await mongoose.getCount(mongooseModel, selector);
      }

      const result = await mongoose.getList(
        mongooseModel,
        selector,
        { limit, skip, sort },
        projFields
      );

      if (result.length === 0) {
        return emptyConnection();
      }

      const edges = result.map((value) => ({
        cursor: idToCursor(value._id),
        node: value,
      }));

      return {
        count,
        edges,
        pageInfo: {
          startCursor: edges[0].cursor,
          endCursor: edges[edges.length - 1].cursor,
          hasPreviousPage: skip !== 0 || !!begin,
          hasNextPage: result.length === limit,
        },
      };
    }

    return null;
  };

  return { args, resolve };
}
