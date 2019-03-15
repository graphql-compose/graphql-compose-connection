/* @flow */
/* eslint-disable no-param-reassign */

import { userTC } from '../__mocks__/userTC';

describe('mocks/userTC', () => {
  it('userTC should have `count` resolver', async () => {
    const cnt = await userTC.getResolver('count').resolve({});
    expect(cnt).toBe(15);
  });

  it('userTC should have `findMany` resolver', async () => {
    const res = await userTC.getResolver('findMany').resolve({});
    expect(res).toHaveLength(15);
  });

  it('userTC should have `findMany` resolver with working `filter` arg', async () => {
    const res = await userTC.getResolver('findMany').resolve({
      args: {
        filter: {
          gender: 'm',
        },
      },
      rawQuery: {
        age: {
          $gt: 15,
          $lt: 20,
        },
        id: {
          $gt: 8,
          $lt: 20,
        },
      },
    });
    expect(res).toEqual([{ id: 9, name: 'user09', age: 19, gender: 'm' }]);
  });

  it('userTC should have `findMany` resolver with working `sort` arg', async () => {
    const res = await userTC.getResolver('findMany').resolve({
      args: {
        sort: {
          age: -1,
          id: -1,
        },
        limit: 5,
      },
    });
    expect(res).toEqual([
      { id: 11, name: 'user11', age: 49, gender: 'm' },
      { id: 10, name: 'user10', age: 49, gender: 'f' },
      { id: 12, name: 'user12', age: 47, gender: 'f' },
      { id: 15, name: 'user15', age: 45, gender: 'm' },
      { id: 14, name: 'user14', age: 45, gender: 'm' },
    ]);
  });
});
