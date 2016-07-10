/* @flow */
/* eslint-disable no-use-before-define */

import { TypeComposer } from 'graphql-compose';


export function composeWithConnection(
  typeComposer: TypeComposer
): TypeComposer {
  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('You should provide TypeComposer instance to composeWithRelay method');
  }

  const findById = typeComposer.getResolver('findById');
  if (!findById) {
    throw new Error(`TypeComposer(${typeComposer.getTypeName()}) provided to composeWithRelay `
                  + 'should have findById resolver.');
  }

  return typeComposer;
}
