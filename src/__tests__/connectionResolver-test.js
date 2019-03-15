/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver } from 'graphql-compose';
import { GraphQLInt, GraphQLString } from 'graphql-compose/lib/graphql';
import { userTC, userList, sortOptions } from '../__mocks__/userTC';
import { dataToCursor } from '../cursor';
import { prepareConnectionResolver, prepareRawQuery, preparePageInfo } from '../connectionResolver';

describe('connectionResolver', () => {
  const connectionResolver = prepareConnectionResolver(userTC, {
    countResolverName: 'count',
    findResolverName: 'findMany',
    sort: sortOptions,
  });

  describe('definition checks', () => {
    it('should return Resolver', () => {
      expect(connectionResolver).toBeInstanceOf(Resolver);
    });

    it('should throw error if first arg is not ObjectTypeComposer', () => {
      expect(() => {
        const wrongArgs: any = [123];
        prepareConnectionResolver(...wrongArgs);
      }).toThrowError('should be instance of ObjectTypeComposer');
    });

    it('should throw error if opts.countResolverName are empty', () => {
      expect(() => {
        const wrongArgs: any = [userTC, {}];
        prepareConnectionResolver(...wrongArgs);
      }).toThrowError('should have option `opts.countResolverName`');
    });

    it('should throw error if resolver opts.countResolverName does not exists', () => {
      expect(() =>
        prepareConnectionResolver(userTC, {
          countResolverName: 'countDoesNotExists',
          findResolverName: 'findMany',
          sort: sortOptions,
        })
      ).toThrowError("does not have resolver with name 'countDoesNotExists'");
    });

    it('should throw error if opts.findResolverName are empty', () => {
      expect(() => {
        const wrongArgs: any = [userTC, { countResolverName: 'count' }];
        prepareConnectionResolver(...wrongArgs);
      }).toThrowError('should have option `opts.findResolverName`');
    });

    it('should throw error if resolver opts.countResolverName does not exists', () => {
      expect(() => {
        const wrongArgs: any = [
          userTC,
          {
            countResolverName: 'count',
            findResolverName: 'findManyDoesNotExists',
            sort: sortOptions,
          },
        ];
        prepareConnectionResolver(...wrongArgs);
      }).toThrowError("does not have resolver with name 'findManyDoesNotExists'");
    });
  });

  describe('resolver basic properties', () => {
    it('should have name `connection`', () => {
      expect(connectionResolver.name).toBe('connection');
    });

    it('should have kind `query`', () => {
      expect(connectionResolver.kind).toBe('query');
    });

    it('should have type to be ConnectionType', () => {
      expect((connectionResolver.type: any).name).toBe('UserConnection');
    });
  });

  describe('resolver args', () => {
    it('should have `first` arg', () => {
      expect(connectionResolver.getArgType('first')).toBe(GraphQLInt);
    });

    it('should have `last` arg', () => {
      expect(connectionResolver.getArgType('last')).toBe(GraphQLInt);
    });

    it('should have `after` arg', () => {
      expect(connectionResolver.getArgType('after')).toBe(GraphQLString);
    });

    it('should have `before` arg', () => {
      expect(connectionResolver.getArgType('before')).toBe(GraphQLString);
    });

    it('should have `sort` arg', () => {
      expect((connectionResolver.getArgType('sort'): any).name).toBe('SortConnectionUserEnum');
    });
  });

  describe('call of resolvers', () => {
    let spyResolveParams;
    let mockedConnectionResolver;
    let findManyResolverCalled;
    let countResolverCalled;

    beforeEach(() => {
      findManyResolverCalled = false;
      countResolverCalled = false;
      const mockedFindMany = userTC.getResolver('findMany').wrapResolve(next => resolveParams => {
        findManyResolverCalled = true;
        spyResolveParams = resolveParams;
        return next(resolveParams);
      });
      const mockedCount = userTC.getResolver('findMany').wrapResolve(next => resolveParams => {
        countResolverCalled = true;
        spyResolveParams = resolveParams;
        return next(resolveParams);
      });
      userTC.setResolver('mockedFindMany', mockedFindMany);
      userTC.setResolver('mockedCount', mockedCount);
      mockedConnectionResolver = prepareConnectionResolver(userTC, {
        countResolverName: 'mockedCount',
        findResolverName: 'mockedFindMany',
        sort: sortOptions,
      });
    });

    it('should pass to findMany args.sort', async () => {
      await mockedConnectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 3,
        },
      });
      expect(spyResolveParams.args.sort.name).toBe(1);
    });

    it('should pass to findMany projection edges.node on top level', async () => {
      await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          edges: {
            node: {
              name: true,
              age: true,
            },
          },
        },
      });
      expect(spyResolveParams.projection.name).toBe(true);
      expect(spyResolveParams.projection.age).toBe(true);
    });

    it('should pass to findMany custom projections to top level', async () => {
      await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          score: { $meta: 'textScore' },
        },
      });
      expect(spyResolveParams.projection.score).toEqual({ $meta: 'textScore' });
    });

    it('should call count but not findMany when only count is projected', async () => {
      await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          count: true,
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(false);
    });

    it('should call count and findMany resolver when not only count is projected', async () => {
      await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          count: true,
          edges: {
            node: {
              name: true,
              age: true,
            },
          },
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany and not count when arbitrary top level fields are projected without count', async () => {
      await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          name: true,
          age: true,
        },
      });
      expect(countResolverCalled).toBe(false);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany and count when arbitrary top level fields are projected with count', async () => {
      await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          count: true,
          name: true,
          age: true,
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call count and findMany resolver when last arg is used but not first arg', async () => {
      await mockedConnectionResolver.resolve({
        args: {
          last: 1,
        },
        projection: {
          edges: {
            node: {
              name: true,
              age: true,
            },
          },
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany but not count resolver when first arg is used', async () => {
      await mockedConnectionResolver.resolve({
        args: { first: 1 },
        projection: {
          edges: {
            node: {
              name: true,
              age: true,
            },
          },
        },
      });
      expect(countResolverCalled).toBe(false);
      expect(findManyResolverCalled).toBe(true);
    });
  });

  describe('prepareRawQuery()', () => {
    const sortConfig = {
      value: { id: 1 },
      cursorFields: ['id'],
      beforeCursorQuery: (rawQuery, cursorData) => {
        rawQuery.before = cursorData;
        return rawQuery;
      },
      afterCursorQuery: (rawQuery, cursorData) => {
        rawQuery.after = cursorData;
        return rawQuery;
      },
    };

    it('should setup in resolveParams.rawQuery', () => {
      const rp: any = {
        args: { filter: { id: 123 } },
      };
      prepareRawQuery(rp, sortConfig);
      expect(rp.rawQuery).toEqual({});
    });

    it('should keep resolveParams.rawQuery if beforeCursorQuery/afterCursorQuery returns undefined', () => {
      const rawQuery = { a: 1 };
      const resolveParams = {
        args: {
          before: dataToCursor({ id1: 1 }),
          after: dataToCursor({ id2: 2 }),
        },
        rawQuery,
      };
      const dumbSortConfig = {
        value: { id: 1 },
        cursorFields: ['id'],
        beforeCursorQuery: () => {},
        afterCursorQuery: () => {},
      };
      prepareRawQuery(resolveParams, dumbSortConfig);
      expect(resolveParams.rawQuery).toBe(rawQuery);
    });

    it('should call afterCursorQuery if provided args.after', () => {
      const rp: any = {
        args: {
          after: dataToCursor({ id: 123 }),
          sort: sortConfig,
        },
      };
      prepareRawQuery(rp, sortConfig);
      expect(rp.rawQuery).toEqual({ after: { id: 123 } });
    });

    it('should call beforeCursorQuery if provided args.before', () => {
      const rp: any = {
        args: {
          before: dataToCursor({ id: 234 }),
          sort: sortConfig,
        },
      };
      prepareRawQuery(rp, sortConfig);
      expect(rp.rawQuery).toEqual({ before: { id: 234 } });
    });

    it('should call afterCursorQuery and beforeCursorQuery', () => {
      const rawQuery = { someKey: 1 };
      const resolveParams = {
        args: {
          before: dataToCursor({ id1: 1 }),
          after: dataToCursor({ id2: 2 }),
        },
        rawQuery,
      };
      prepareRawQuery(resolveParams, sortConfig);
      expect(resolveParams.rawQuery).toEqual({
        someKey: 1,
        before: { id1: 1 },
        after: { id2: 2 },
      });
    });
  });

  describe('preparePageInfo()', () => {
    const fiveEdges = [
      { cursor: 1, node: 1 },
      { cursor: 2, node: 2 },
      { cursor: 3, node: 3 },
      { cursor: 4, node: 4 },
      { cursor: 5, node: 5 },
    ];

    describe('"Relay Cursor Connections Specification (PageInfo)":', () => {
      describe('HasPreviousPage', () => {
        it('If last was not set (but first is present), return false.', () => {
          expect(preparePageInfo(fiveEdges, { first: 2 }, 5, 2).hasPreviousPage).toBe(false);
        });
        it('If last was not set (and first is empty), return true.', () => {
          expect(preparePageInfo(fiveEdges, {}, 5, 2).hasPreviousPage).toBe(true);
        });
        it('If last was not set (but after is present), return true.', () => {
          expect(preparePageInfo(fiveEdges, { after: 'abc' }, 5, 0).hasPreviousPage).toBe(true);
        });
        it('If edges contains more than last elements, return true.', () => {
          expect(preparePageInfo(fiveEdges, { last: 3 }, 3, 2).hasPreviousPage).toBe(true);
        });
        it('Return false', () => {
          expect(preparePageInfo(fiveEdges, { last: 5 }, 5, 0).hasPreviousPage).toBe(false);
        });
      });

      describe('HasNextPage', () => {
        it('If first was not set (and last is empty), return true.', () => {
          // By current Relay Cursor Connections Specification
          //   if `first` and `last` are empty `hasNextPage` should be false.
          // This rule is deviation from specification for better dev experience:
          //   when first and last args are empty
          //   we should check if exist more edges and provide correct `hasNextPage` value.
          expect(preparePageInfo(fiveEdges, {}, 4, 0).hasNextPage).toBe(true);
        });
        it('If first was not set (but last is present), return false.', () => {
          expect(preparePageInfo(fiveEdges, { last: 200 }, 4, 0).hasNextPage).toBe(false);
        });
        it('If edges contains more than first elements, return true.', () => {
          expect(preparePageInfo(fiveEdges, { first: 4 }, 4, 0).hasNextPage).toBe(true);
        });
        it('Return false', () => {
          expect(preparePageInfo(fiveEdges, { first: 5 }, 5, 0).hasNextPage).toBe(false);
        });
      });

      it('should return startCursor', () => {
        expect(preparePageInfo(fiveEdges, {}, 4, 0).startCursor).toBe(1);
        expect(preparePageInfo(fiveEdges, {}, 4, 2).startCursor).toBe(1);
      });

      it('should return endCursor', () => {
        expect(preparePageInfo(fiveEdges, {}, 4, 0).endCursor).toBe(4);
        expect(preparePageInfo(fiveEdges, {}, 20, 0).endCursor).toBe(5);
      });

      it('should return correct values for pageInfo if last is less first', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
            last: 3,
          },
        });
        expect(result.pageInfo.hasNextPage).toBe(true);
        expect(result.pageInfo.hasPreviousPage).toBe(true);
      });

      it('should return correct values for pageInfo if `last` toBe `first`', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
            last: 5,
          },
        });
        expect(result.pageInfo.hasNextPage).toBe(true);
        expect(result.pageInfo.hasPreviousPage).toBe(false);
      });

      it('should return correct values for pageInfo if set only `first`', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
          },
        });
        expect(result.pageInfo.hasNextPage).toBe(true);
        expect(result.pageInfo.hasPreviousPage).toBe(false);

        const result2 = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: userList.length,
          },
        });
        expect(result2.pageInfo.hasNextPage).toBe(false);
        expect(result2.pageInfo.hasPreviousPage).toBe(false);
      });

      it('should return correct values for pageInfo if set only `last`', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            last: 5,
          },
        });
        expect(result.pageInfo.hasPreviousPage).toBe(true);
        expect(result.pageInfo.hasNextPage).toBe(false);

        const result2 = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            last: userList.length,
          },
        });
        expect(result2.pageInfo.hasPreviousPage).toBe(false);
        expect(result2.pageInfo.hasNextPage).toBe(false);
      });
    });
  });

  describe('"Relay Cursor Connections Specification (Pagination algorithm)":', () => {
    describe('ApplyCursorsToEdges(allEdges, before, after):', () => {
      it('if `after` cursor is set, should return next record', async () => {
        const result = await connectionResolver.resolve({
          args: {
            after: dataToCursor({ id: 2 }),
            sort: sortOptions.ID_ASC.value,
            first: 1,
          },
        });
        expect(result.edges[0].node.id).toBe(3);
      });

      it('if `before` cursor is set, should return previous record', async () => {
        const result = await connectionResolver.resolve({
          args: {
            before: dataToCursor({ id: 2 }),
            sort: sortOptions.ID_ASC.value,
            first: 1,
          },
        });
        expect(result.edges[0].node.id).toBe(1);
      });

      it('if `before` and `after` cursors are set, should return between records', async () => {
        const result = await connectionResolver.resolve({
          args: {
            after: dataToCursor({ id: 2 }),
            before: dataToCursor({ id: 6 }),
            sort: sortOptions.ID_ASC.value,
            first: 10,
          },
        });
        expect(result.edges).toHaveLength(3);
        expect(result.edges[0].node.id).toBe(3);
        expect(result.edges[1].node.id).toBe(4);
        expect(result.edges[2].node.id).toBe(5);
      });

      it('should throw error if `first` is less than 0', async () => {
        const promise = connectionResolver.resolve({
          args: {
            first: -5,
            sort: sortOptions.ID_ASC.value,
          },
        });
        await expect(promise).rejects.toMatchSnapshot();
      });

      it('should slice edges to be length of `first`, if length is greater', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
          },
        });
        expect(result.edges).toHaveLength(5);
      });

      it('should throw error if `last` is less than 0', async () => {
        const promise = connectionResolver.resolve({
          args: {
            last: -5,
            sort: sortOptions.ID_ASC.value,
          },
        });
        await expect(promise).rejects.toMatchSnapshot();
      });

      it('should slice edges to be length of `last`', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            last: 3,
          },
        });
        expect(result.edges).toHaveLength(3);
      });

      it('should slice edges to be length of `last`, if `first` and `last` present', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
            last: 2,
          },
        });
        expect(result.edges).toHaveLength(2);
      });

      it('serve complex fetching with all connection args', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            after: dataToCursor({ id: 5 }),
            before: dataToCursor({ id: 13 }),
            first: 5,
            last: 3,
          },
          projection: {
            count: true,
            edges: {
              node: {
                name: true,
              },
            },
          },
        });
        expect(result.edges).toHaveLength(3);
        expect(result.edges[0].node.id).toBe(8);
        expect(result.edges[1].node.id).toBe(9);
        expect(result.edges[2].node.id).toBe(10);
        expect(result.count).toBe(15);
      });

      it('should correctly prepare cursor for before and after args', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 3,
          },
        });
        expect(result.edges).toHaveLength(3);
        const { cursor } = result.edges[1];
        const prev = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 1,
            before: cursor,
          },
        });
        expect(prev.edges[0].node.id).toBe(result.edges[0].node.id);
        const conn = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 1,
            after: cursor,
          },
        });
        expect(conn.edges[0].node.id).toBe(result.edges[2].node.id);
      });
    });

    it('should return previous edges when querying with last and before', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: sortOptions.ID_ASC.value,
          before: dataToCursor({ id: 4 }),
          last: 2,
        },
      });
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe(2);
      expect(result.edges[1].node.id).toBe(3);
    });
  });

  describe('how works filter argument with resolve', () => {
    it('should add additional filtering', async () => {
      const result = await connectionResolver.resolve({
        args: {
          filter: {
            gender: 'm',
          },
          sort: sortOptions.ID_ASC.value,
          first: 100,
        },
        projection: {
          count: true,
          edges: {
            node: {
              name: true,
            },
          },
        },
      });
      expect(result.edges).toHaveLength(8);
      expect(result.edges[0].node).toEqual({
        id: 1,
        name: 'user01',
        age: 11,
        gender: 'm',
      });
      expect(result.edges[7].node).toEqual({
        id: 15,
        name: 'user15',
        age: 45,
        gender: 'm',
      });
      expect(result.count).toBe(8);
    });
  });

  describe('fallback logic (offset in cursor)', () => {
    it('if `after` cursor is set, should return next record', async () => {
      const result = await connectionResolver.resolve({
        args: {
          after: dataToCursor(1),
          sort: { name: 1 },
          first: 1,
        },
      });
      expect(result.edges[0].node.id).toBe(3);
    });

    it('if `before` cursor is set, should return previous record', async () => {
      const result = await connectionResolver.resolve({
        args: {
          before: dataToCursor(1),
          sort: { name: 1 },
          first: 1,
        },
      });
      expect(result.edges[0].node.id).toBe(1);
    });

    it('if `before` and `after` cursors are set, should return between records', async () => {
      const result = await connectionResolver.resolve({
        args: {
          after: dataToCursor(1),
          before: dataToCursor(5),
          sort: { name: 1 },
          first: 10,
        },
      });
      expect(result.edges).toHaveLength(3);
      expect(result.edges[0].node.id).toBe(3);
      expect(result.edges[1].node.id).toBe(4);
      expect(result.edges[2].node.id).toBe(5);
    });

    it('should throw error if `first` is less than 0', async () => {
      const promise = connectionResolver.resolve({
        args: {
          first: -5,
          sort: { name: 1 },
        },
      });
      await expect(promise).rejects.toMatchSnapshot();
    });

    it('should slice edges to be length of `first`, if length is greater', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 5,
        },
      });
      expect(result.edges).toHaveLength(5);
    });

    it('should throw error if `last` is less than 0', async () => {
      const promise = connectionResolver.resolve({
        args: {
          last: -5,
          sort: { name: 1 },
        },
      });
      await expect(promise).rejects.toMatchSnapshot();
    });

    it('should slice edges to be length of `last`', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          last: 3,
        },
      });
      expect(result.edges).toHaveLength(3);
    });

    it('should slice edges to be length of `last`, if `first` and `last` present', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 5,
          last: 2,
        },
      });
      expect(result.edges).toHaveLength(2);
    });

    it('serve complex fetching with all connection args', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          after: dataToCursor(4),
          before: dataToCursor(12),
          first: 5,
          last: 3,
        },
        projection: {
          count: true,
          edges: {
            node: {
              id: true,
            },
          },
        },
      });
      expect(result.edges).toHaveLength(3);
      expect(result.edges[0].node.id).toBe(8);
      expect(result.edges[1].node.id).toBe(9);
      expect(result.edges[2].node.id).toBe(10);
      expect(result.count).toBe(15);
    });

    it('should correctly prepare cursor for before and after args', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 3,
        },
      });
      expect(result.edges).toHaveLength(3);
      const { cursor } = result.edges[1];
      const prev = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 1,
          before: cursor,
        },
      });
      expect(prev.edges[0].node.id).toBe(result.edges[0].node.id);
      const next = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 1,
          after: cursor,
        },
      });
      expect(next.edges[0].node.id).toBe(result.edges[2].node.id);
    });

    it('should reduce limit if reach cursor offset', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          before: dataToCursor(2),
          first: 5,
        },
      });
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe(1);
      expect(result.edges[1].node.id).toBe(2);
    });
  });

  describe('default `first` argument if first/last are empty', () => {
    const defaultResolver = prepareConnectionResolver(userTC, {
      countResolverName: 'count',
      findResolverName: 'findMany',
      sort: sortOptions,
      defaultLimit: 5,
    });

    it('should use defaultLimit option', async () => {
      const data = await defaultResolver.resolve({ args: {} });
      expect(data.edges.length).toBe(5);
      expect(data.pageInfo.hasNextPage).toBe(true);
    });

    it('should use defaultLimit option with after option', async () => {
      const data = await defaultResolver.resolve({ args: { after: 'NA==' } });
      expect(data.edges.length).toBe(5);
      expect(data.pageInfo.hasNextPage).toBe(true);
      expect(data.pageInfo.hasPreviousPage).toBe(true);
    });
  });
});
