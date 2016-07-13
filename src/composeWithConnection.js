/* @flow */

import { TypeComposer } from 'graphql-compose';
import type {
  composeWithConnectionOpts,
} from './definition.js';
import { prepareConnectionResolver } from './resolvers/connectionResolver';

export function composeWithConnection(
  typeComposer: TypeComposer,
  opts: composeWithConnectionOpts
): TypeComposer {
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('You should provide TypeComposer instance to composeWithRelay method');
  }

  if (!opts) {
    throw new Error('You provide empty options to composeWithConnection');
  }

  if (typeComposer.hasResolver('connection')) {
    return typeComposer;
  }

  const resolver = prepareConnectionResolver(
    typeComposer,
    opts
  );

  typeComposer.addResolver(resolver);
  return typeComposer;
}
