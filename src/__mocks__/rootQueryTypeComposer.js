import { TypeComposer, graphql } from 'graphql-compose';

const RootQuery = new graphql.GraphQLObjectType({
  name: 'RootQuery',
  fields: {},
});

export const rootQueryTypeComposer = new TypeComposer(RootQuery);
