/* @flow */

import { ObjectTypeComposer } from 'graphql-compose';
import { prepareConnectionResolver } from './connectionResolver';
import type { ComposeWithConnectionOpts } from './connectionResolver';
import { resolverName } from './utils/name';

export function composeWithConnection<TSource, TContext>(
  typeComposer: ObjectTypeComposer<TSource, TContext>,
  opts: ComposeWithConnectionOpts
): ObjectTypeComposer<TSource, TContext> {
  if (!typeComposer || typeComposer.constructor.name !== 'ObjectTypeComposer') {
    throw new Error('You should provide ObjectTypeComposer instance to composeWithRelay method');
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
