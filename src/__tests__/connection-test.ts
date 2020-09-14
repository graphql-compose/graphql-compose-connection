import { Resolver, ResolverResolveParams } from 'graphql-compose';
import {
  UserTC,
  UserLinkTC,
  countResolver,
  findManyResolver,
  userList,
  sortOptions,
  countThroughLinkResolver,
  findManyThroughLinkResolver,
} from '../__mocks__/User';
import { dataToCursor } from '../cursor';
import {
  prepareConnectionResolver,
  prepareRawQuery,
  preparePageInfo,
  ConnectionSortOpts,
  ConnectionTArgs,
} from '../connection';

describe('prepareConnectionResolver()', () => {
  const connectionResolver = prepareConnectionResolver(UserTC, {
    countResolver,
    findManyResolver,
    sort: sortOptions,
  });

  describe('definition checks', () => {
    it('should return Resolver', () => {
      expect(connectionResolver).toBeInstanceOf(Resolver);
    });

    it('should throw error if first arg is not ObjectTypeComposer', () => {
      expect(() => {
        const wrongArgs = [123];
        // @ts-expect-error
        prepareConnectionResolver(...wrongArgs);
      }).toThrowError('should be instance of ObjectTypeComposer');
    });

    it('should throw error if opts.countResolver is incorrect', () => {
      expect(() => {
        const wrongArgs = [UserTC, {}];
        // @ts-expect-error
        prepareConnectionResolver(...wrongArgs);
      }).toThrowError("'opts.countResolver' must be a Resolver instance");
    });

    it('should throw error if opts.findManyResolver is incorrect', () => {
      expect(() => {
        const wrongArgs = [UserTC, { countResolver }];
        // @ts-expect-error
        prepareConnectionResolver(...wrongArgs);
      }).toThrowError("'opts.findManyResolver' must be a Resolver instance");
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
      expect(connectionResolver.type.getTypeName()).toBe('UserConnection');
    });
  });

  describe('resolver args', () => {
    it('should have `first` arg', () => {
      expect(connectionResolver.getArgTypeName('first')).toBe('Int');
    });

    it('should have `last` arg', () => {
      expect(connectionResolver.getArgTypeName('last')).toBe('Int');
    });

    it('should have `after` arg', () => {
      expect(connectionResolver.getArgTypeName('after')).toBe('String');
    });

    it('should have `before` arg', () => {
      expect(connectionResolver.getArgTypeName('before')).toBe('String');
    });

    it('should have `sort` arg', () => {
      expect(connectionResolver.getArgTypeName('sort')).toBe('SortConnectionUserEnum');
    });
  });

  describe('call of resolvers', () => {
    let spyResolveParams: ResolverResolveParams<any, any>;
    let mockedConnectionResolver: Resolver;
    let findManyResolverCalled: boolean;
    let countResolverCalled: boolean;

    beforeEach(() => {
      findManyResolverCalled = false;
      countResolverCalled = false;
      const mockedFindMany = findManyResolver.wrapResolve((next) => (resolveParams) => {
        findManyResolverCalled = true;
        spyResolveParams = resolveParams;
        return next(resolveParams);
      });
      const mockedCount = findManyResolver.wrapResolve((next) => (resolveParams) => {
        countResolverCalled = true;
        spyResolveParams = resolveParams;
        return next(resolveParams);
      });
      mockedConnectionResolver = prepareConnectionResolver(UserTC, {
        countResolver: mockedCount,
        findManyResolver: mockedFindMany,
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
    } as ConnectionSortOpts;

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
      } as Partial<ResolverResolveParams<any, any, ConnectionTArgs>>;
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
      { cursor: '1', node: 1 },
      { cursor: '2', node: 2 },
      { cursor: '3', node: 3 },
      { cursor: '4', node: 4 },
      { cursor: '5', node: 5 },
    ];

    describe('"Relay Cursor Connections Specification (PageInfo)":', () => {
      describe('HasPreviousPage', () => {
        it('If first is set (and after is empty), return false.', () => {
          expect(preparePageInfo(fiveEdges, { first: 4 }, 4, 0).hasPreviousPage).toBe(false);
        });
        it('If first is set (and after is present), return true.', () => {
          expect(preparePageInfo(fiveEdges, { first: 4, after: 'abc' }, 4, 0).hasPreviousPage).toBe(
            true
          );
        });
        it('If last is set (and before is empty), and edges contains more than last elements, return true.', () => {
          // if `first` is empty and `last` is set, `first` will be assigned according to count of edges targeted
          expect(preparePageInfo(fiveEdges, { first: 10, last: 5 }, 5, 5).hasPreviousPage).toBe(
            true
          );
        });
        it('If last is set (and before is empty), and edges contains no more than last elements, return false.', () => {
          expect(preparePageInfo(fiveEdges, { first: 5, last: 5 }, 5, 0).hasPreviousPage).toBe(
            false
          );
        });
        it('If last is set (and before is present), and edges contains more than last elements, return true.', () => {
          expect(
            preparePageInfo(fiveEdges, { first: 10, last: 4, before: 'abc' }, 4, 6).hasPreviousPage
          ).toBe(true);
        });
        it('If last is set (and before is present), and edges contains no more than last elements, return false.', () => {
          expect(
            preparePageInfo(fiveEdges, { first: 4, last: 4, before: 'abc' }, 4, 0).hasPreviousPage
          ).toBe(false);
        });
        it('If both first and last are set, and edges contains more than last elements, return true.', () => {
          expect(preparePageInfo(fiveEdges, { first: 10, last: 4 }, 4, 6).hasPreviousPage).toBe(
            true
          );
        });
        it('If both first and last are set, and edges contains no more than last elements, return true.', () => {
          expect(preparePageInfo(fiveEdges, { first: 4, last: 4 }, 4, 0).hasPreviousPage).toBe(
            false
          );
        });
      });

      describe('HasNextPage', () => {
        it('If first was not set (and last is empty), and there is more edges, return true.', () => {
          // By current Relay Cursor Connections Specification
          //   if `first` and `last` are empty `hasNextPage` should be false.
          // This rule is deviation from specification for better dev experience:
          //   when first and last args are empty
          //   we should check if exist more edges and provide correct `hasNextPage` value.
          expect(preparePageInfo(fiveEdges, {}, 4, 0).hasNextPage).toBe(true);
        });
        it('If last is set (and before is empty), return false.', () => {
          // if `first` is empty and `last` is set, `first` will be assigned according to count of edges targeted
          expect(preparePageInfo(fiveEdges, { first: 10, last: 5 }, 5, 5).hasNextPage).toBe(false);
        });
        it('If last is set (and before is present), return true.', () => {
          expect(
            preparePageInfo(fiveEdges, { first: 10, last: 4, before: 'abc' }, 4, 6).hasNextPage
          ).toBe(true);
        });
        it('If first is set (and after is empty), and edges contains more than first elements, return true.', () => {
          expect(preparePageInfo(fiveEdges, { first: 4 }, 4, 0).hasNextPage).toBe(true);
        });
        it('If first is set (and after is empty), and edges contains no more than first elements, return false.', () => {
          expect(preparePageInfo(fiveEdges, { first: 5 }, 5, 0).hasNextPage).toBe(false);
        });
        it('If first is set (and after is present), and edges contains more than first elements, return true.', () => {
          expect(preparePageInfo(fiveEdges, { first: 4, after: 'abc' }, 4, 0).hasNextPage).toBe(
            true
          );
        });
        it('If first is set (and after is present), and edges contains no more than first elements, return false.', () => {
          expect(preparePageInfo(fiveEdges, { first: 5, after: 'abc' }, 5, 0).hasNextPage).toBe(
            false
          );
        });
        it('If both first and last are set, and edges contains more than first elements, return true.', () => {
          expect(preparePageInfo(fiveEdges, { first: 10, last: 4 }, 4, 6).hasNextPage).toBe(true);
        });
        it('If both first and last are set, and edges contains no more than first elements, return false.', () => {
          expect(preparePageInfo(fiveEdges, { first: 10, last: 6 }, 6, 4).hasNextPage).toBe(false);
        });
      });

      it('should return startCursor', () => {
        expect(preparePageInfo(fiveEdges, {}, 4, 0).startCursor).toBe('1');
        expect(preparePageInfo(fiveEdges, {}, 4, 2).startCursor).toBe('1');
      });

      it('should return endCursor', () => {
        expect(preparePageInfo(fiveEdges, {}, 4, 0).endCursor).toBe('4');
        expect(preparePageInfo(fiveEdges, {}, 20, 0).endCursor).toBe('5');
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
        await expect(promise).rejects.toThrow('Argument `first` should be non-negative number');
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
        await expect(promise).rejects.toThrow('Argument `last` should be non-negative number');
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
      await expect(promise).rejects.toThrow('Argument `first` should be non-negative number');
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
      await expect(promise).rejects.toThrow('Argument `last` should be non-negative number');
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
    const defaultResolver = prepareConnectionResolver(UserTC, {
      countResolver,
      findManyResolver,
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

  describe('edges with data', () => {
    const edgeDataResolver = prepareConnectionResolver(UserTC, {
      countResolver: countThroughLinkResolver,
      findManyResolver: findManyThroughLinkResolver,
      sort: sortOptions,
      defaultLimit: 5,
      edgeFields: UserLinkTC.getFields(),
    });
    it('correctly resolves with edges', async () => {
      const data = await edgeDataResolver.resolve({
        args: {},
        projection: { count: true, edges: true },
      });
      expect(data).toEqual({
        count: 2,
        edges: [
          {
            cursor: 'MA==',
            id: 1,
            node: { age: 12, gender: 'm', id: 2, name: 'user02' },
            otherUserId: 2,
            type: 'likes',
            userId: 1,
          },
          {
            cursor: 'MQ==',
            id: 2,
            node: { age: 11, gender: 'm', id: 1, name: 'user01' },
            otherUserId: 1,
            type: 'dislikes',
            userId: 2,
          },
        ],
        pageInfo: {
          endCursor: 'MQ==',
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'MA==',
        },
      });
    });
    it('correctly handles filtering', async () => {
      const data = await edgeDataResolver.resolve({
        args: { filter: { edge: { type: 'likes' } } },
        projection: { count: true, edges: true },
      });
      expect(data.edges.length).toBe(1);
      expect(data).toEqual({
        count: 1,
        edges: [
          {
            cursor: 'MA==',
            id: 1,
            node: { age: 12, gender: 'm', id: 2, name: 'user02' },
            otherUserId: 2,
            type: 'likes',
            userId: 1,
          },
        ],
        pageInfo: {
          endCursor: 'MA==',
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'MA==',
        },
      });
    });
  });
});
