/* eslint-disable no-param-reassign */

import { expect } from 'chai';
import {
  graphql,
  GraphQLSchema,
} from 'graphql';
import { TypeComposer } from 'graphql-compose';
import { composeWithConnection } from '../composeWithConnection';
import { userTypeComposer, sortOptions } from '../__mocks__/userTypeComposer';
import { rootQueryTypeComposer } from '../__mocks__/rootQueryTypeComposer';


describe('composeWithRelay', () => {
  const userComposer = composeWithConnection(userTypeComposer, {
    countResolverName: 'count',
    findResolverName: 'findMany',
    sort: sortOptions,
  });

  describe('basic checks', () => {
    it('should return TypeComposer', () => {
      expect(userComposer).instanceof(TypeComposer);
    });

    it('should throw error if first arg is not TypeComposer', () => {
      expect(() => composeWithConnection(123)).to.throw('should provide TypeComposer instance');
    });

    it('should throw error if options are empty', () => {
      expect(() => composeWithConnection(userTypeComposer))
        .to.throw('should provide non-empty options');
    });
  });

  it('should apply first sort ID_ASC by default', async () => {
    rootQueryTypeComposer.addField('userConnection',
      userTypeComposer.getResolver('connection').getFieldConfig()
    );
    const schema = new GraphQLSchema({
      query: rootQueryTypeComposer.getType(),
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
    const result = await graphql(schema, query);
    expect(result)
      .deep.property('data.userConnection')
      .deep.equals({
        count: 15,
        pageInfo:
         { startCursor: 'eyJpZCI6MTN9',
           endCursor: 'eyJpZCI6MTV9',
           hasPreviousPage: true,
           hasNextPage: false },
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
    rootQueryTypeComposer.addField('userConnection',
      userTypeComposer.getResolver('connection').getFieldConfig()
    );
    const schema = new GraphQLSchema({
      query: rootQueryTypeComposer.getType(),
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
    const result = await graphql(schema, query);
    expect(result)
      .deep.property('data.userConnection')
      .deep.equals({
        count: 15,
        pageInfo:
         { startCursor: 'eyJhZ2UiOjQ5LCJpZCI6MTF9',
           endCursor: 'eyJhZ2UiOjQ3LCJpZCI6MTJ9',
           hasPreviousPage: false,
           hasNextPage: true },
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
      rootQueryTypeComposer.addField('userConnection',
        userTypeComposer.getResolver('connection').getFieldConfig()
      );
      const schema = new GraphQLSchema({
        query: rootQueryTypeComposer.getType(),
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
      expect(result).to.deep.equal({
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
                  name: 'user1',
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
});
