/* eslint-disable no-param-reassign */

import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLInt,
} from 'graphql';
import { TypeComposer, Resolver } from 'graphql-compose';

export const UserType = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: {
      type: GraphQLInt,
    },
    name: {
      type: GraphQLString,
    },
    age: {
      type: GraphQLInt,
    },
    gender: {
      type: GraphQLString,
    },
  },
});

export const userTypeComposer = new TypeComposer(UserType);

export const userList = [
  { id: 1, name: 'user1', age: 11, gender: 'm' },
  { id: 2, name: 'user2', age: 12, gender: 'm' },
  { id: 3, name: 'user3', age: 13, gender: 'f' },
  { id: 4, name: 'user4', age: 14, gender: 'm' },
  { id: 5, name: 'user5', age: 15, gender: 'f' },
  { id: 6, name: 'user6', age: 16, gender: 'f' },
  { id: 7, name: 'user7', age: 17, gender: 'f' },
  { id: 8, name: 'user8', age: 18, gender: 'm' },
  { id: 9, name: 'user9', age: 19, gender: 'm' },
  { id: 10, name: 'user10', age: 49, gender: 'f' },
  { id: 11, name: 'user11', age: 49, gender: 'm' },
  { id: 12, name: 'user12', age: 47, gender: 'f' },
  { id: 15, name: 'user15', age: 45, gender: 'm' },
  { id: 14, name: 'user14', age: 45, gender: 'm' },
  { id: 13, name: 'user13', age: 45, gender: 'f' },
];

const filterArgConfig = {
  name: 'filter',
  type: new GraphQLInputObjectType({
    name: 'FilterUserInput',
    fields: {
      gender: {
        type: GraphQLString,
      },
      age: {
        type: GraphQLInt,
      },
    },
  }),
};

function filteredUserList(list, filter = {}) {
  let result = list.slice();
  if (filter.gender) {
    result = result.filter(o => o.gender === filter.gender);
  }

  if (filter.id) {
    if (filter.id.$lt) {
      result = result.filter(o => o.id < filter.id.$lt);
    }
    if (filter.id.$gt) {
      result = result.filter(o => o.id > filter.id.$gt);
    }
  }
  if (filter.age) {
    if (filter.age.$lt) {
      result = result.filter(o => o.age < filter.age.$lt);
    }
    if (filter.age.$gt) {
      result = result.filter(o => o.age > filter.age.$gt);
    }
  }

  return result;
}

function sortUserList(list, sortValue = {}) {
  const fields = Object.keys(sortValue);
  list.sort((a, b) => {
    let result = 0;
    fields.forEach(field => {
      if (result === 0) {
        if (a[field] < b[field]) {
          result = sortValue[field] * -1;
        } else if (a[field] > b[field]) {
          result = sortValue[field];
        }
      }
    });
    return result;
  });
  return list;
}

function prepareFilterFromArgs(resolveParams = {}) {
  const args = resolveParams.args || {};
  const filter = Object.assign({}, args.filter);
  if (resolveParams.rawQuery) {
    Object.keys(resolveParams.rawQuery).forEach((k) => {
      filter[k] = resolveParams.rawQuery[k];
    });
  }
  return filter;
}

export const findManyResolver = new Resolver({
  name: 'findMany',
  kind: 'query',
  outputType: UserType,
  args: {
    filter: filterArgConfig,
    sort: new GraphQLEnumType({
      name: 'SortUserInput',
      values: {
        ID_ASC: { name: 'ID_ASC', value: { id: 1 } },
        ID_DESC: { name: 'ID_DESC', value: { id: -1 } },
        AGE_ASC: { name: 'AGE_ASC', value: { age: 1 } },
        AGE_DESC: { name: 'AGE_DESC', value: { age: -1 } },
      },
    }),
    limit: GraphQLInt,
    skip: GraphQLInt,
  },
  resolve: (resolveParams) => {
    const args = resolveParams.args || {};
    const { filter, sort, limit, skip } = args;

    let list = userList.slice();
    list = sortUserList(list, sort);
    list = filteredUserList(list, prepareFilterFromArgs(resolveParams));

    if (skip) {
      list = list.slice(skip);
    }

    if (limit) {
      list = list.slice(0, limit);
    }

    return Promise.resolve(list);
  },
});
userTypeComposer.setResolver('findMany', findManyResolver);


export const countResolver = new Resolver({
  name: 'count',
  kind: 'query',
  outputType: GraphQLInt,
  args: {
    filter: filterArgConfig,
  },
  resolve: (resolveParams) => {
    return Promise.resolve(
      filteredUserList(
        userList,
        prepareFilterFromArgs(resolveParams)
      ).length
    );
  },
});
userTypeComposer.setResolver('count', countResolver);


export const sortOptions = {
  ID_ASC: {
    value: { id: 1 },
    cursorFields: ['id'],
    beforeCursorQuery: (rawQuery, cursorData, resolveParams) => {
      if (!rawQuery.id) rawQuery.id = {};
      rawQuery.id.$lt = cursorData.id;
    },
    afterCursorQuery: (rawQuery, cursorData, resolveParams) => {
      if (!rawQuery.id) rawQuery.id = {};
      rawQuery.id.$gt = cursorData.id;
    },
  },
  AGE_ID_DESC: {
    value: { age: -1, id: -1 },
    cursorFields: ['age', 'id'],
    beforeCursorQuery: (rawQuery, cursorData, resolveParams) => {
      if (!rawQuery.age) rawQuery.age = {};
      if (!rawQuery.id) rawQuery.id = {};
      rawQuery.age = { $gt: cursorData.age };
      rawQuery.id = { $gt: cursorData.id };
    },
    afterCursorQuery: (rawQuery, cursorData, resolveParams) => {
      if (!rawQuery.age) rawQuery.age = {};
      if (!rawQuery.id) rawQuery.id = {};
      rawQuery.age = { $lt: cursorData.age };
      rawQuery.id = { $lt: cursorData.id };
    },
  },
};
