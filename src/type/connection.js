/* eslint-disable arrow-body-style */

import {
  GraphQLInt,
  GraphQLString,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';

import PageInfoType from './pageInfo';

export function getEdgeType(graphqlType, opts) {
  const name = `${graphqlType.name}Edge`;

  return new GraphQLObjectType({
    name,
    description: 'An edge in a connection.',
    fields: () => ({
      node: {
        type: graphqlType,
        description: 'The item at the end of the edge',
      },
      cursor: {
        type: new GraphQLNonNull(GraphQLString),
        description: 'A cursor for use in pagination',
      },
    }),
  });
}


export function getConnectionType(graphqlType, opts) {
  const name = `${graphqlType.name}Connection`;

  return Storage.getTypeWithCache(name, () => {
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
          type: new GraphQLList(getEdgeType(graphqlType, opts)),
          description: 'Information to aid in pagination.',
        },
      }),
    });
  });
}
