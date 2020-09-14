import { ObjectTypeComposer } from 'graphql-compose';
import { prepareConnectionResolver } from './connection';
import type { ConnectionResolverOpts } from './connection';

export function composeWithConnection<TSource, TContext>(
  typeComposer: ObjectTypeComposer<TSource, TContext>,
  opts: ConnectionResolverOpts<TContext>
): ObjectTypeComposer<TSource, TContext> {
  if (!(typeComposer instanceof ObjectTypeComposer)) {
    throw new Error('You should provide ObjectTypeComposer instance to composeWithRelay method');
  }

  if (!opts) {
    throw new Error('You should provide non-empty options to composeWithConnection');
  }

  const resolverName = opts.name || 'connection';
  if (typeComposer.hasResolver(resolverName)) {
    return typeComposer;
  }

  const resolver = prepareConnectionResolver(typeComposer, opts);

  typeComposer.setResolver(resolverName, resolver);
  return typeComposer;
}
