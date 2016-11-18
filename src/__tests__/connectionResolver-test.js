/* eslint-disable no-param-reassign */

import { expect } from 'chai';
import { GraphQLInt } from 'graphql';
import { Resolver } from 'graphql-compose';
import { userTypeComposer, userList, sortOptions } from '../__mocks__/userTypeComposer';
import { dataToCursor, cursorToData } from '../cursor';
import {
  prepareConnectionResolver,
  prepareRawQuery,
  preparePageInfo,
} from '../connectionResolver';
import Cursor from '../types/cursorType';


describe('connectionResolver', () => {
  const connectionResolver = prepareConnectionResolver(userTypeComposer, {
    countResolverName: 'count',
    findResolverName: 'findMany',
    sort: sortOptions,
  });

  describe('definition checks', () => {
    it('should return Resolver', () => {
      expect(connectionResolver).instanceof(Resolver);
    });

    it('should throw error if first arg is not TypeComposer', () => {
      expect(() => prepareConnectionResolver(123))
        .to.throw('should be instance of TypeComposer');
    });

    it('should throw error if opts.countResolverName are empty', () => {
      expect(() => prepareConnectionResolver(userTypeComposer, {}))
        .to.throw('should have option `opts.countResolverName`');
    });

    it('should throw error if resolver opts.countResolverName does not exists', () => {
      expect(() => prepareConnectionResolver(userTypeComposer, {
        countResolverName: 'countDoesNotExists',
        findResolverName: 'findMany',
        sort: sortOptions,
      }))
        .to.throw('should have resolver with name \'countDoesNotExists\'');
    });

    it('should throw error if opts.findResolverName are empty', () => {
      expect(() => prepareConnectionResolver(userTypeComposer, {
        countResolverName: 'count',
      }))
        .to.throw('should have option `opts.findResolverName`');
    });

    it('should throw error if resolver opts.countResolverName does not exists', () => {
      expect(() => prepareConnectionResolver(userTypeComposer, {
        countResolverName: 'count',
        findResolverName: 'findManyDoesNotExists',
        sort: sortOptions,
      }))
        .to.throw('should have resolver with name \'findManyDoesNotExists\'');
    });
  });

  describe('resolver basic properties', () => {
    it('should have name `connection`', () => {
      expect(connectionResolver).property('name').equals('connection');
    });

    it('should have kind `query`', () => {
      expect(connectionResolver).property('kind').equals('query');
    });

    it('should have outputType to be ConnectionType', () => {
      expect(connectionResolver).deep.property('outputType.name').equals('UserConnection');
    });
  });

  describe('resolver args', () => {
    it('should have `first` arg', () => {
      expect(connectionResolver.getArg('first')).property('type').equals(GraphQLInt);
    });

    it('should have `last` arg', () => {
      expect(connectionResolver.getArg('last')).property('type').equals(GraphQLInt);
    });

    it('should have `after` arg', () => {
      expect(connectionResolver.getArg('after')).property('type').equals(Cursor);
    });

    it('should have `before` arg', () => {
      expect(connectionResolver.getArg('before')).property('type').equals(Cursor);
    });

    it('should have `sort` arg', () => {
      expect(connectionResolver.getArg('sort'))
        .deep.property('type.name').equals('SortConnectionUserEnum');
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
      const mockedFindMany = userTypeComposer.getResolver('findMany')
        .wrapResolve((next) => (resolveParams) => {
          findManyResolverCalled = true;
          spyResolveParams = resolveParams;
          return next(resolveParams);
        });
      const mockedCount = userTypeComposer.getResolver('findMany')
        .wrapResolve((next) => (resolveParams) => {
          countResolverCalled = true;
          spyResolveParams = resolveParams;
          return next(resolveParams);
        });
      userTypeComposer.setResolver('mockedFindMany', mockedFindMany);
      userTypeComposer.setResolver('mockedCount', mockedCount);
      mockedConnectionResolver = prepareConnectionResolver(userTypeComposer, {
        countResolverName: 'mockedCount',
        findResolverName: 'mockedFindMany',
        sort: sortOptions,
      });
    });

    it('should pass to findMany args.sort', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 3,
        },
      });
      expect(spyResolveParams).have.deep.property('args.sort.name', 1);
    });

    it('should pass to findMany projection edges.node on top level', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          edges: {
            node: {
              name: true,
              age: true,
            }
          }
        },
      });
      expect(spyResolveParams).have.deep.property('projection.name', true);
      expect(spyResolveParams).have.deep.property('projection.age', true);
    });

    it('should pass to findMany custom projections to top level', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          score: { $meta: 'textScore' },
        },
      });
      expect(spyResolveParams).have.deep.property('projection.score');
      expect(spyResolveParams).have.deep.property('projection.score')
        .to.deep.equal({ $meta: 'textScore' });
    });

    it('should call count but not findMany when only count is projected', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          count : true
        },
      });
      expect(countResolverCalled, 'count resolver called').to.be.true;
      expect(findManyResolverCalled, 'findMany resolver called').to.be.false;
    });

    it('should call count and findMany resolver when not only count is projected', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          count : true,
          edges : {
            node : {
              name : true,
              age : true
            }
          }
        },
      });
      expect(countResolverCalled, 'count resolver called').to.be.true;
      expect(findManyResolverCalled, 'findMany resolver called').to.be.true;
    });

    it('should call findMany and not count when arbitrary top level fields are projected without count', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          name: true,
          age: true
        },
      });
      expect(countResolverCalled, 'count resolver called').to.be.false;
      expect(findManyResolverCalled, 'findMany resolver called').to.be.true;
    });

    it('should call findMany and count when arbitrary top level fields are projected with count', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: {},
        projection: {
          count: true,
          name: true,
          age: true
        },
      });
      expect(countResolverCalled, 'count resolver called').to.be.true;
      expect(findManyResolverCalled, 'findMany resolver called').to.be.true;
    });

    it('should call count and findMany resolver when last arg is used but not first arg', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: {
          last: 1
        },
        projection: {
          edges : {
            node : {
              name : true,
              age : true
            }
          }
        },
      });
      expect(countResolverCalled, 'count resolver called').to.be.true;
      expect(findManyResolverCalled, 'findMany resolver called').to.be.true;
    });

    it('should call findMany but not count resolver when first arg is used', async () => {
      const result = await mockedConnectionResolver.resolve({
        args: { first: 1 },
        projection: {
          edges : {
            node : {
              name : true,
              age : true
            }
          }
        },
      });
      expect(countResolverCalled, 'count resolver called').to.be.false;
      expect(findManyResolverCalled, 'findMany resolver called').to.be.true;
    });
  });

  describe('prepareRawQuery()', () => {
    const sortConfig = {
      value: { id: 1 },
      cursorFields: ['id'],
      beforeCursorQuery: (rawQuery, cursorData, resolveParams) => {
        rawQuery.before = cursorData;
        return rawQuery;
      },
      afterCursorQuery: (rawQuery, cursorData, resolveParams) => {
        rawQuery.after = cursorData;
        return rawQuery;
      },
    };

    it('should setup in resolveParams.rawQuery', () => {
      const rp = {
        args: { filter: 123 },
      };
      prepareRawQuery(rp, sortConfig);
      expect(rp.rawQuery).to.deep.equal({});
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
        beforeCursorQuery: () => {},
        afterCursorQuery: () => {},
      };
      prepareRawQuery(resolveParams, dumbSortConfig);
      expect(resolveParams.rawQuery).equal(rawQuery);
    });

    it('should call afterCursorQuery if provided args.after', () => {
      const rp = {
        args: {
          after: dataToCursor({ id: 123 }),
          sort: { id: 1 },
        }
      };
      prepareRawQuery(rp, sortConfig);
      expect(rp.rawQuery).to.deep.equal({ after: { id: 123 } });
    });

    it('should call beforeCursorQuery if provided args.before', () => {
      const rp = {
        args: {
          before: dataToCursor({ id: 234 }),
          sort: { id: 1 },
        },
      };
      prepareRawQuery(rp, sortConfig);
      expect(rp.rawQuery).to.deep.equal({ before: { id: 234 } });
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
      expect(resolveParams.rawQuery).deep.equal({
        someKey: 1,
        before: { id1: 1 },
        after: { id2: 2 },
      });
    });
  });

  describe('preparePageInfo()', () => {
    const edges = [
      { cursor: 1, node: 1 },
      { cursor: 2, node: 2 },
      { cursor: 3, node: 3 },
      { cursor: 4, node: 4 },
      { cursor: 5, node: 5 },
    ];

    describe('"Relay Cursor Connections Specification (PageInfo)":', () => {
      describe('HasPreviousPage', () => {
        it('1. If last was not set, return false.', () => {
          expect(preparePageInfo(edges, {}, 5, 2))
            .property('hasPreviousPage').to.be.false;
        });
        it('3. If edges contains more than last elements, return true.', () => {
          expect(preparePageInfo(edges, { last: 3 }, 3, 2))
            .property('hasPreviousPage').to.be.true;
        });
        it('4. Return false', () => {
          expect(preparePageInfo(edges, { last: 5 }, 5, 0))
            .property('hasPreviousPage').to.be.false;
        });
      });

      describe('HasNextPage', () => {
        it('1. If first was not set, return false.', () => {
          expect(preparePageInfo(edges, {}, 4, 0))
            .property('hasNextPage').to.be.false;
        });
        it('3. If edges contains more than first elements, return true.', () => {
          expect(preparePageInfo(edges, { first: 4 }, 4, 0))
            .property('hasNextPage').to.be.true;
        });
        it('4. Return false', () => {
          expect(preparePageInfo(edges, { first: 5 }, 5, 0))
            .property('hasNextPage').to.be.false;
        });
      });

      it('should return startCursor', () => {
        expect(preparePageInfo(edges, {}, 4, 0))
          .property('startCursor').to.be.equal(1);
        expect(preparePageInfo(edges, {}, 4, 2))
          .property('startCursor').to.be.equal(1);
      });

      it('should return endCursor', () => {
        expect(preparePageInfo(edges, {}, 4, 0))
          .property('endCursor').to.be.equal(4);
        expect(preparePageInfo(edges, {}, 20, 0))
          .property('endCursor').to.be.equal(5);
      });

      it('should return correct values for pageInfo if last is less first', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
            last: 3,
          },
        });
        expect(result).deep.property('pageInfo.hasNextPage').to.be.true;
        expect(result).deep.property('pageInfo.hasPreviousPage').to.be.true;
      });

      it('should return correct values for pageInfo if `last` equals `first`', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
            last: 5,
          },
        });
        expect(result).deep.property('pageInfo.hasNextPage').to.be.true;
        expect(result).deep.property('pageInfo.hasPreviousPage').to.be.false;
      });

      it('should return correct values for pageInfo if set only `first`', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
          },
        });
        expect(result).deep.property('pageInfo.hasNextPage').to.be.true;
        expect(result).deep.property('pageInfo.hasPreviousPage').to.be.false;

        const result2 = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: userList.length,
          },
        });
        expect(result2).deep.property('pageInfo.hasNextPage').to.be.false;
        expect(result2).deep.property('pageInfo.hasPreviousPage').to.be.false;
      });

      it('should return correct values for pageInfo if set only `last`', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            last: 5,
          },
        });
        expect(result).deep.property('pageInfo.hasPreviousPage').to.be.true;
        expect(result).deep.property('pageInfo.hasNextPage').to.be.false;

        const result2 = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            last: userList.length,
          },
        });
        expect(result2).deep.property('pageInfo.hasPreviousPage').to.be.false;
        expect(result2).deep.property('pageInfo.hasNextPage').to.be.false;
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
        expect(result).deep.property('edges.0.node.id').equals(3);
      });

      it('if `before` cursor is set, should return previous record', async () => {
        const result = await connectionResolver.resolve({
          args: {
            before: dataToCursor({ id: 2 }),
            sort: sortOptions.ID_ASC.value,
            first: 1,
          },
        });
        expect(result).deep.property('edges.0.node.id').equals(1);
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
        expect(result).deep.property('edges').to.have.length(3);
        expect(result).deep.property('edges.0.node.id').equals(3);
        expect(result).deep.property('edges.1.node.id').equals(4);
        expect(result).deep.property('edges.2.node.id').equals(5);
      });

      it('should throw error if `first` is less than 0', async () => {
        const promise = connectionResolver.resolve({
          args: {
            first: -5,
            sort: sortOptions.ID_ASC.value,
          },
        });
        await expect(promise).be.rejectedWith(Error, 'should be non-negative number');
      });

      it('should slice edges to be length of `first`, if length is greater', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
          },
        });
        expect(result).deep.property('edges').to.have.length(5);
      });

      it('should throw error if `last` is less than 0', async () => {
        const promise = connectionResolver.resolve({
          args: {
            last: -5,
            sort: sortOptions.ID_ASC.value,
          },
        });
        await expect(promise).be.rejectedWith(Error, 'should be non-negative number');
      });

      it('should slice edges to be length of `last`', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            last: 3,
          },
        });
        expect(result).deep.property('edges').to.have.length(3);
      });

      it('should slice edges to be length of `last`, if `first` and `last` present', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 5,
            last: 2,
          },
        });
        expect(result).deep.property('edges').to.have.length(2);
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
            edges : {
              node : {
                name: true
              }
            }
          },
        });
        expect(result).deep.property('edges').to.have.length(3);
        expect(result).deep.property('edges.0.node.id').equals(8);
        expect(result).deep.property('edges.1.node.id').equals(9);
        expect(result).deep.property('edges.2.node.id').equals(10);
        expect(result).deep.property('count').equals(15);
      });

      it('should correctly prepare cursor for before and after args', async () => {
        const result = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 3,
          },
        });
        expect(result).deep.property('edges').to.have.length(3);
        const cursor = result.edges[1].cursor;
        const prev = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 1,
            before: cursor,
          },
        });
        expect(prev).deep.property('edges.0.node.id')
          .equals(result.edges[0].node.id);
        const next = await connectionResolver.resolve({
          args: {
            sort: sortOptions.ID_ASC.value,
            first: 1,
            after: cursor,
          },
        });
        expect(next).deep.property('edges.0.node.id')
          .equals(result.edges[2].node.id);
      });
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
          edges : {
            node : {
              name: true
            }
          }
        },
      });
      expect(result).deep.property('edges').to.have.length(8);
      expect(result).deep.property('edges.0.node')
        .deep.equals({ id: 1, name: 'user01', age: 11, gender: 'm' });
      expect(result).deep.property('edges.7.node')
        .deep.equals({ id: 15, name: 'user15', age: 45, gender: 'm' });
      expect(result).deep.property('count').equals(8);
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
      expect(result).deep.property('edges.0.node.id').equals(3);
    });

    it('if `before` cursor is set, should return previous record', async () => {
      const result = await connectionResolver.resolve({
        args: {
          before: dataToCursor(1),
          sort: { name: 1 },
          first: 1,
        },
      });
      expect(result).deep.property('edges.0.node.id').equals(1);
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
      expect(result).deep.property('edges').to.have.length(3);
      expect(result).deep.property('edges.0.node.id').equals(3);
      expect(result).deep.property('edges.1.node.id').equals(4);
      expect(result).deep.property('edges.2.node.id').equals(5);
    });

    it('should throw error if `first` is less than 0', async () => {
      const promise = connectionResolver.resolve({
        args: {
          first: -5,
          sort: { name: 1 },
        },
      });
      await expect(promise).be.rejectedWith(Error, 'should be non-negative number');
    });

    it('should slice edges to be length of `first`, if length is greater', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 5,
        },
      });
      expect(result).deep.property('edges').to.have.length(5);
    });

    it('should throw error if `last` is less than 0', async () => {
      const promise = connectionResolver.resolve({
        args: {
          last: -5,
          sort: { name: 1 },
        },
      });
      await expect(promise).be.rejectedWith(Error, 'should be non-negative number');
    });

    it('should slice edges to be length of `last`', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          last: 3,
        },
      });
      expect(result).deep.property('edges').to.have.length(3);
    });

    it('should slice edges to be length of `last`, if `first` and `last` present', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 5,
          last: 2,
        },
      });
      expect(result).deep.property('edges').to.have.length(2);
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
          edges : {
            node : {
              id: true
            }
          }
        },
      });
      expect(result).deep.property('edges').to.have.length(3);
      expect(result).deep.property('edges.0.node.id').equals(8);
      expect(result).deep.property('edges.1.node.id').equals(9);
      expect(result).deep.property('edges.2.node.id').equals(10);
      expect(result).deep.property('count').equals(15);
    });

    it('should correctly prepare cursor for before and after args', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 3,
        },
      });
      expect(result).deep.property('edges').to.have.length(3);
      const cursor = result.edges[1].cursor;
      const prev = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 1,
          before: cursor,
        },
      });
      expect(prev).deep.property('edges.0.node.id')
        .equals(result.edges[0].node.id);
      const next = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 1,
          after: cursor,
        },
      });
      expect(next).deep.property('edges.0.node.id')
        .equals(result.edges[2].node.id);
    });

    it('should reduce limit if reach cursor offset', async () => {
      const result = await connectionResolver.resolve({
        args: {
          sort: { name: 1 },
          before: dataToCursor(2),
          first: 5,
        },
      });
      expect(result).deep.property('edges').to.have.length(2);
      expect(result).deep.property('edges.0.node.id').equals(1);
      expect(result).deep.property('edges.1.node.id').equals(2);
    });
  });
});
