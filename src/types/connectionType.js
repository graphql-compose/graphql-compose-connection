/* @flow */
/* eslint-disable arrow-body-style */

import {
  GraphQLInt,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';
import GraphQLConnectionCursor from './cursorType';
import type {
  TypeComposer,
} from 'graphql-compose';

import PageInfoType from './pageInfoType';


export function prepareEdgeType(typeComposer: TypeComposer): GraphQLObjectType {
  const name = `${typeComposer.getTypeName()}Edge`;

  return new GraphQLObjectType({
    name,
    description: 'An edge in a connection.',
    fields: () => ({
      node: {
        type: typeComposer.getType(),
        description: 'The item at the end of the edge',
      },
      cursor: {
        type: new GraphQLNonNull(GraphQLConnectionCursor),
        description: 'A cursor for use in pagination',
      },
    }),
  });
}


export function prepareConnectionType(typeComposer: TypeComposer): GraphQLObjectType {
  const name = `${typeComposer.getTypeName()}Connection`;

  return new GraphQLObjectType({
    name,
    description: 'A connection to a list of items.',
    fields: () => ({
      count: {
        type: GraphQLInt,
        description: 'Total object count.',
      },
      pageInfo: {
        type: new GraphQLNonNull(PageInfoType),
        description: 'Information to aid in pagination.',
      },
      edges: {
        type: new GraphQLList(prepareEdgeType(typeComposer)),
        description: 'Information to aid in pagination.',
      },
    }),
  });
}
