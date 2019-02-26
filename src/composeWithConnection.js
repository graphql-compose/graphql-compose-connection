/* @flow */

import { TypeComposer } from 'graphql-compose';
import { prepareConnectionResolver } from './connectionResolver';
import type { ComposeWithConnectionOpts } from './connectionResolver';
import { resolverName } from './utils/name';

export function composeWithConnection(
  typeComposer: TypeComposer,
  opts: ComposeWithConnectionOpts
): TypeComposer {
  if (!typeComposer || typeComposer.constructor.name !== 'TypeComposer') {
    throw new Error('You should provide TypeComposer instance to composeWithRelay method');
  }

  if (!opts) {
    throw new Error('You should provide non-empty options to composeWithConnection');
  }

  if (typeComposer.hasResolver(resolverName(opts.connectionResolverName))) {
    return typeComposer;
  }

  const resolver = prepareConnectionResolver(typeComposer, opts);

  typeComposer.setResolver(resolverName(opts.connectionResolverName), resolver);
  return typeComposer;
}
