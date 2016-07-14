import { TypeComposer } from 'graphql-compose';
import {
  GraphQLObjectType,
} from 'graphql';

const RootQuery = new GraphQLObjectType({
  name: 'RootQuery',
  fields: {
  },
});

export const rootQueryTypeComposer = new TypeComposer(RootQuery);
