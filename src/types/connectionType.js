/* @flow */
/* eslint-disable arrow-body-style */

import {
  GraphQLInt,
  GraphQLString,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql-compose/lib/graphql';
import type { ObjectTypeComposer } from 'graphql-compose';

import PageInfoType from './pageInfoType';
import { typeName } from '../utils/name';

const cachedConnectionTypes = new WeakMap();
const cachedEdgeTypes = new WeakMap();

export function prepareEdgeType(typeComposer: ObjectTypeComposer<any, any>): GraphQLObjectType {
  const name = `${typeComposer.getTypeName()}Edge`;
  const type = typeComposer.getType();

  if (cachedEdgeTypes.has(type)) {
    return (cachedEdgeTypes.get(type): any);
  }

  const edgeType = new GraphQLObjectType({
    name,
    description: 'An edge in a connection.',
    fields: () => ({
      node: {
        type: new GraphQLNonNull(typeComposer.getType()),
        description: 'The item at the end of the edge',
      },
      cursor: {
        type: new GraphQLNonNull(GraphQLString),
        description: 'A cursor for use in pagination',
      },
    }),
  });

  // This is small HACK for providing to graphql-compose/src/projection.js
  // information about required fields in projection and relations
  // $FlowFixMe
  edgeType.ofType = type;

  cachedEdgeTypes.set(type, edgeType);
  return edgeType;
}

export function prepareConnectionType(
  typeComposer: ObjectTypeComposer<any, any>,
  resolverName: ?string
): GraphQLObjectType {
  const name = `${typeComposer.getTypeName()}${typeName(resolverName)}`;
  const type = typeComposer.getType();

  if (cachedConnectionTypes.has(type) && (cachedConnectionTypes.get(type): any).has(name)) {
    return ((cachedConnectionTypes.get(type): any).get(name): any);
  }

  const connectionType = new GraphQLObjectType({
    name,
    description: 'A connection to a list of items.',
    fields: () => ({
      count: {
        type: new GraphQLNonNull(GraphQLInt),
        description: 'Total object count.',
      },
      pageInfo: {
        type: new GraphQLNonNull(PageInfoType),
        description: 'Information to aid in pagination.',
      },
      edges: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(prepareEdgeType(typeComposer)))
        ),
        description: 'Information to aid in pagination.',
      },
    }),
  });

  // This is small HACK for providing to graphql-compose/src/projection.js
  // information about required fields in projection and relations
  // $FlowFixMe
  connectionType.ofType = type;

  if (!cachedConnectionTypes.has(type)) {
    cachedConnectionTypes.set(type, new Map());
    // Can't use WeakMap because keys must be strings
  }
  (cachedConnectionTypes.get(type): any).set(name, connectionType);
  return connectionType;
}
