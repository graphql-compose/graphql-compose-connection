/* @flow */
/* eslint-disable no-param-reassign */

import { userTC, sortOptions } from '../../__mocks__/userTC';
import { prepareConnectionResolver } from '../../connectionResolver';

describe('check last/before args', () => {
  const defaultResolver = prepareConnectionResolver(userTC, {
    countResolverName: 'count',
    findResolverName: 'findMany',
    sort: sortOptions,
  });

  it('with sort arg', async () => {
    const res1 = await defaultResolver.resolve({
      args: {
        last: 2,
        before: '',
        sort: { id: 1 },
      },
    });
    expect(res1.edges).toEqual([
      { cursor: 'eyJpZCI6MTR9', node: { age: 45, gender: 'm', id: 14, name: 'user14' } },
      { cursor: 'eyJpZCI6MTV9', node: { age: 45, gender: 'm', id: 15, name: 'user15' } },
    ]);

    const res2 = await defaultResolver.resolve({
      args: {
        last: 2,
        before: 'eyJpZCI6MTR9',
        sort: { id: 1 },
      },
    });
    expect(res2.edges).toEqual([
      { cursor: 'eyJpZCI6MTJ9', node: { age: 47, gender: 'f', id: 12, name: 'user12' } },
      { cursor: 'eyJpZCI6MTN9', node: { age: 45, gender: 'f', id: 13, name: 'user13' } },
    ]);
  });

  it('without sort arg', async () => {
    const res1 = await defaultResolver.resolve({
      args: {
        last: 2,
        before: '',
      },
    });
    expect(res1.edges).toEqual([
      { cursor: 'MTM=', node: { age: 45, gender: 'm', id: 14, name: 'user14' } },
      { cursor: 'MTQ=', node: { age: 45, gender: 'f', id: 13, name: 'user13' } },
    ]);

    const res2 = await defaultResolver.resolve({
      args: {
        last: 2,
        before: 'MTM=',
      },
    });
    expect(res2.edges).toEqual([
      { cursor: 'MTE=', node: { age: 47, gender: 'f', id: 12, name: 'user12' } },
      { cursor: 'MTI=', node: { age: 45, gender: 'm', id: 15, name: 'user15' } },
    ]);
  });
});
