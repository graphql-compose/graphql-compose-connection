/* @flow */

import { schemaComposer } from 'graphql-compose';

export const rootQueryTC = schemaComposer.createObjectTC({
  name: 'RootQuery',
  fields: {},
});
