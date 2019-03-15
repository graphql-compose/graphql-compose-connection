/* @flow */
/* eslint-disable no-param-reassign */

import { schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import { GraphQLSchema, GraphQLList, GraphQLNonNull, graphql } from 'graphql-compose/lib/graphql';
import { composeWithConnection } from '../composeWithConnection';
import { userTC, sortOptions } from '../__mocks__/userTC';
import { rootQueryTC } from '../__mocks__/rootQueryTC';

describe('composeWithRelay', () => {
  const userComposer = composeWithConnection(userTC, {
    countResolverName: 'count',
    findResolverName: 'findMany',
    sort: sortOptions,
  });

  describe('basic checks', () => {
    it('should return ObjectTypeComposer', () => {
      expect(userComposer).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should throw error if first arg is not ObjectTypeComposer', () => {
      expect(() => {
        const wrongArgs: any = [123];
        composeWithConnection(...wrongArgs);
      }).toThrowError('should provide ObjectTypeComposer instance');
    });

    it('should throw error if options are empty', () => {
      expect(() => {
        const wrongArgs: any = [userTC];
        composeWithConnection(...wrongArgs);
      }).toThrowError('should provide non-empty options');
    });

    it('should not change `connection` resolver if exists', () => {
      let myTC = schemaComposer.createObjectTC('type Complex { a: String, b: Int }');
      myTC.addResolver({
        name: 'connection',
        resolve: () => 'mockData',
      });

      // try ovewrite `connection` resolver
      myTC = composeWithConnection(myTC, {
        countResolverName: 'count',
        findResolverName: 'findMany',
        sort: sortOptions,
      });

      expect(myTC.getResolver('connection')).toBeTruthy();
      expect(myTC.getResolver('connection').resolve({})).toBe('mockData');
    });

    it('should add resolver with user-specified name', () => {
      let myTC = schemaComposer.createObjectTC('type CustomComplex { a: String, b: Int }');
      myTC.addResolver({
        name: 'count',
        resolve: () => 1,
      });
      myTC.addResolver({
        name: 'findMany',
        resolve: () => ['mockData'],
      });
      myTC = composeWithConnection(myTC, {
        connectionResolverName: 'customConnection',
        countResolverName: 'count',
        findResolverName: 'findMany',
        sort: sortOptions,
      });

      expect(myTC.getResolver('customConnection')).toBeTruthy();
      expect(myTC.hasResolver('connection')).toBeFalsy();
    });

    it('should add two connection resolvers', () => {
      let myTC = schemaComposer.createObjectTC('type CustomComplex { a: String, b: Int }');
      myTC.addResolver({
        name: 'count',
        resolve: () => 1,
      });
      myTC.addResolver({
        name: 'findMany',
        resolve: () => ['mockData'],
      });
      myTC = composeWithConnection(myTC, {
        countResolverName: 'count',
        findResolverName: 'findMany',
        sort: sortOptions,
      });
      myTC = composeWithConnection(myTC, {
        connectionResolverName: 'customConnection',
        countResolverName: 'count',
        findResolverName: 'findMany',
        sort: sortOptions,
      });

      expect(myTC.hasResolver('connection')).toBeTruthy();
      expect(myTC.getResolver('customConnection')).toBeTruthy();
    });
  });

  describe('check `connection` resolver props', () => {
    const rsv = userComposer.getResolver('connection');
    const type: any = rsv.getType();
    const tc = schemaComposer.createObjectTC(type);

    it('should exists', () => {
      expect(rsv).toBeTruthy();
    });

    it('should has ConnectionType as type', () => {
      expect(type).toBeTruthy();
      expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['count', 'pageInfo', 'edges']));
      const edgesType: any = tc.getFieldType('edges');
      expect(edgesType).toBeInstanceOf(GraphQLNonNull);
      expect(edgesType.ofType).toBeInstanceOf(GraphQLList);
    });
  });

  it('should apply first sort ID_ASC by default', async () => {
    rootQueryTC.setField('userConnection', userTC.getResolver('connection'));
    const schema = new GraphQLSchema({
      query: rootQueryTC.getType(),
    });
    const query = `{
      userConnection(last: 3) {
        count,
        pageInfo {
          startCursor
          endCursor
          hasPreviousPage
          hasNextPage
        }
        edges {
          cursor
          node {
            id
            name
          }
        }
      }
    }`;
    const result: any = await graphql(schema, query);

    expect(result.data.userConnection).toEqual({
      count: 15,
      pageInfo: {
        startCursor: 'eyJpZCI6MTN9',
        endCursor: 'eyJpZCI6MTV9',
        hasPreviousPage: true,
        hasNextPage: false,
      },
      edges: [
        {
          cursor: 'eyJpZCI6MTN9',
          node: { id: 13, name: 'user13' },
        },
        {
          cursor: 'eyJpZCI6MTR9',
          node: { id: 14, name: 'user14' },
        },
        {
          cursor: 'eyJpZCI6MTV9',
          node: { id: 15, name: 'user15' },
        },
      ],
    });
  });

  it('should able to change `sort` on AGE_ID_DESC', async () => {
    rootQueryTC.setField('userConnection', userTC.getResolver('connection'));
    const schema = new GraphQLSchema({
      query: rootQueryTC.getType(),
    });
    const query = `{
      userConnection(first: 3, sort: AGE_ID_DESC) {
        count,
        pageInfo {
          startCursor
          endCursor
          hasPreviousPage
          hasNextPage
        }
        edges {
          cursor
          node {
            id
            name
            age
          }
        }
      }
    }`;
    const result: any = await graphql(schema, query);

    expect(result.data.userConnection).toEqual({
      count: 15,
      pageInfo: {
        startCursor: 'eyJhZ2UiOjQ5LCJpZCI6MTF9',
        endCursor: 'eyJhZ2UiOjQ3LCJpZCI6MTJ9',
        hasPreviousPage: false,
        hasNextPage: true,
      },
      edges: [
        {
          cursor: 'eyJhZ2UiOjQ5LCJpZCI6MTF9',
          node: { id: 11, name: 'user11', age: 49 },
        },
        {
          cursor: 'eyJhZ2UiOjQ5LCJpZCI6MTB9',
          node: { id: 10, name: 'user10', age: 49 },
        },
        {
          cursor: 'eyJhZ2UiOjQ3LCJpZCI6MTJ9',
          node: { id: 12, name: 'user12', age: 47 },
        },
      ],
    });
  });

  describe('fragments fields projection of graphql-compose', () => {
    it('should return object', async () => {
      rootQueryTC.setField('userConnection', userTC.getResolver('connection'));
      const schema = new GraphQLSchema({
        query: rootQueryTC.getType(),
      });
      const query = `{
        userConnection(first: 1) {
          count,
          pageInfo {
            startCursor
            endCursor
            ...on PageInfo {
              hasPreviousPage
              hasNextPage
            }
          }
          edges {
            cursor
            node {
              id
              name
              ...idNameAge
              ...on User {
                age
              }
            }
          }
        }
      }
      fragment idNameAge on User {
        gender
      }
      `;
      const result = await graphql(schema, query);
      expect(result).toEqual({
        data: {
          userConnection: {
            count: 15,
            edges: [
              {
                cursor: 'eyJpZCI6MX0=',
                node: {
                  age: 11,
                  gender: 'm',
                  id: 1,
                  name: 'user01',
                },
              },
            ],
            pageInfo: {
              endCursor: 'eyJpZCI6MX0=',
              hasPreviousPage: false,
              hasNextPage: true,
              startCursor: 'eyJpZCI6MX0=',
            },
          },
        },
      });
    });
  });

  it('should pass `countResolveParams` to top resolverParams', async () => {
    let topResolveParams: any = {};

    rootQueryTC.setField(
      'userConnection',
      userTC.getResolver('connection').wrapResolve(next => rp => {
        const result = next(rp);
        topResolveParams = rp;
        return result;
      })
    );
    const schema = new GraphQLSchema({
      query: rootQueryTC.getType(),
    });
    const query = `{
      userConnection(first: 1, filter: { age: 45 }) {
        count
      }
    }`;
    await graphql(schema, query);

    expect(Object.keys(topResolveParams.countResolveParams)).toEqual(
      expect.arrayContaining(['source', 'args', 'context', 'info', 'projection'])
    );

    expect(topResolveParams.countResolveParams.args).toEqual({
      filter: { age: 45 },
    });
  });

  it('should pass `findManyResolveParams` to top resolverParams', async () => {
    let topResolveParams: any = {};

    rootQueryTC.setField(
      'userConnection',
      userTC.getResolver('connection').wrapResolve(next => rp => {
        const result = next(rp);
        topResolveParams = rp;
        return result;
      })
    );
    const schema = new GraphQLSchema({
      query: rootQueryTC.getType(),
    });
    const query = `{
      userConnection(first: 1, filter: { age: 45 }) {
        count
      }
    }`;
    await graphql(schema, query);

    expect(Object.keys(topResolveParams.findManyResolveParams)).toEqual(
      expect.arrayContaining(['source', 'args', 'context', 'info', 'projection'])
    );

    expect(topResolveParams.findManyResolveParams.args).toEqual({
      filter: { age: 45 },
      limit: 2,
      sort: { id: 1 },
      first: 1,
    });
  });
});
