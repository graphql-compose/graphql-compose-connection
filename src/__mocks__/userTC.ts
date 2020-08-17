import { schemaComposer, ResolverResolveParams } from 'graphql-compose';
import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLInt,
} from 'graphql-compose/lib/graphql';
import type { ConnectionSortMapOpts } from '../connectionResolver';

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

export const UserLinkType = new GraphQLObjectType({
  name: 'UserLink',
  fields: {
    id: {
      type: GraphQLInt,
    },
    type: {
      type: GraphQLString,
    },
    userId: {
      type: GraphQLInt,
    },
    otherUserId: {
      type: GraphQLInt,
    },
  },
});

export const userTC = schemaComposer.createObjectTC(UserType);
export const userLinkTC = schemaComposer.createObjectTC(UserLinkType);

export const userList = [
  { id: 1, name: 'user01', age: 11, gender: 'm' },
  { id: 2, name: 'user02', age: 12, gender: 'm' },
  { id: 3, name: 'user03', age: 13, gender: 'f' },
  { id: 4, name: 'user04', age: 14, gender: 'm' },
  { id: 5, name: 'user05', age: 15, gender: 'f' },
  { id: 6, name: 'user06', age: 16, gender: 'f' },
  { id: 7, name: 'user07', age: 17, gender: 'f' },
  { id: 8, name: 'user08', age: 18, gender: 'm' },
  { id: 9, name: 'user09', age: 19, gender: 'm' },
  { id: 10, name: 'user10', age: 49, gender: 'f' },
  { id: 11, name: 'user11', age: 49, gender: 'm' },
  { id: 12, name: 'user12', age: 47, gender: 'f' },
  { id: 15, name: 'user15', age: 45, gender: 'm' },
  { id: 14, name: 'user14', age: 45, gender: 'm' },
  { id: 13, name: 'user13', age: 45, gender: 'f' },
];

export const userLinkList = [
  { id: 1, type: 'likes', userId: 1, otherUserId: 2 },
  { id: 2, type: 'dislikes', userId: 2, otherUserId: 1 },
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

const filterEdgeArgConfig = {
  name: 'filter',
  type: new GraphQLInputObjectType({
    name: 'FilterNodeEdgeUserInput',
    fields: {
      edge: {
        type: new GraphQLInputObjectType({
          name: 'FilterNodeEdgeEdgeUserInput',
          fields: {
            type: {
              type: GraphQLString,
            },
          },
        }),
      },
      node: {
        type: new GraphQLInputObjectType({
          name: 'FilterNodeNodeEdgeUserInput',
          fields: {
            gender: {
              type: GraphQLString,
            },
            age: {
              type: GraphQLInt,
            },
          },
        }),
      },
    },
  }),
};

function filterUserLink(
  link: typeof userLinkList[0],
  filter = {} as Partial<typeof userLinkList[0]>
) {
  let pred = true;
  if (filter.type) {
    pred = pred && link.type === filter.type;
  }
  return pred;
}

function filterUser(user: typeof userList[0], filter = {} as any) {
  let pred = true;
  if (filter.gender) {
    pred = pred && user.gender === filter.gender;
  }

  if (filter.id) {
    if (filter.id.$lt) {
      pred = pred && user.id < filter.id.$lt;
    }
    if (filter.id.$gt) {
      pred = pred && user.id > filter.id.$gt;
    }
  }
  if (filter.age) {
    if (filter.age.$lt) {
      pred = pred && user.age < filter.age.$lt;
    }
    if (filter.age.$gt) {
      pred = pred && user.age > filter.age.$gt;
    }
  }
  return pred;
}

function filteredUserList(list: typeof userList, filter = {}) {
  return list.slice().filter((o) => filterUser(o, filter));
}

function sortUserList(
  list: typeof userList,
  sortValue = {} as Record<keyof typeof userList[0], number>
) {
  const fields = Object.keys(sortValue) as Array<keyof typeof userList[0]>;
  list.sort((a, b) => {
    let result = 0;
    fields.forEach((field) => {
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

function prepareFilterFromArgs(resolveParams = {} as ResolverResolveParams<any, any>) {
  const args = resolveParams.args || {};
  const filter = { ...args.filter };
  if (resolveParams.rawQuery) {
    Object.keys(resolveParams.rawQuery).forEach((k) => {
      filter[k] = resolveParams.rawQuery[k];
    });
  }
  return filter;
}

export const findManyResolver = schemaComposer.createResolver({
  name: 'findMany',
  kind: 'query',
  type: UserType,
  args: {
    filter: filterArgConfig,
    sort: new GraphQLEnumType({
      name: 'SortUserInput',
      values: {
        ID_ASC: { value: { id: 1 } },
        ID_DESC: { value: { id: -1 } },
        AGE_ASC: { value: { age: 1 } },
        AGE_DESC: { value: { age: -1 } },
      },
    }),
    limit: GraphQLInt,
    skip: GraphQLInt,
  },
  resolve: (resolveParams) => {
    const args = resolveParams.args || {};
    const { sort, limit, skip } = args;

    let list = userList.slice();
    list = sortUserList(list, sort as any);
    list = filteredUserList(list, prepareFilterFromArgs(resolveParams));

    if (skip) {
      list = list.slice(skip as any);
    }

    if (limit) {
      list = list.slice(0, limit as any);
    }

    return Promise.resolve(list);
  },
});
userTC.setResolver('findMany', findManyResolver);

export const countResolver = schemaComposer.createResolver({
  name: 'count',
  kind: 'query',
  type: GraphQLInt,
  args: {
    filter: filterArgConfig,
  },
  resolve: (resolveParams) => {
    return Promise.resolve(filteredUserList(userList, prepareFilterFromArgs(resolveParams)).length);
  },
});
userTC.setResolver('count', countResolver);

function getThroughLinkResolver(list: typeof userLinkList, filter: any) {
  const nodeFilter = filter ? filter.node : {};
  const edgeFilter = filter ? filter.edge : {};
  return list
    .map((link) => ({
      ...link,
      node: userList.find((u) => u.id === link.otherUserId && filterUser(u, nodeFilter)),
    }))
    .filter((l) => !!l.node && filterUserLink(l, edgeFilter));
}

export const findManyThroughLinkResolver = schemaComposer.createResolver({
  name: 'findManyThroughLink',
  kind: 'query',
  type: UserType,
  args: {
    filter: filterEdgeArgConfig,
    limit: GraphQLInt,
    skip: GraphQLInt,
  },
  resolve: async (resolveParams) => {
    const args = resolveParams.args || {};
    const { limit, skip } = args;

    let list = userLinkList.slice();

    if (skip) {
      list = list.slice(skip as any);
    }

    if (limit) {
      list = list.slice(0, limit as any);
    }
    return getThroughLinkResolver(list, args.filter);
  },
});
userTC.setResolver('findManyThroughLink', findManyThroughLinkResolver);

export const countThroughLinkResolver = schemaComposer.createResolver({
  name: 'count',
  kind: 'query',
  type: GraphQLInt,
  args: {
    filter: filterEdgeArgConfig,
  },
  resolve: async (resolveParams) => {
    const args = resolveParams.args || {};
    return getThroughLinkResolver(userLinkList.slice(), args.filter).length;
  },
});
userTC.setResolver('countThroughLink', countThroughLinkResolver);

export const sortOptions: ConnectionSortMapOpts = {
  ID_ASC: {
    value: { id: 1 },
    cursorFields: ['id'],
    beforeCursorQuery: (rawQuery, cursorData) => {
      if (!rawQuery.id) rawQuery.id = {};
      rawQuery.id.$lt = cursorData.id;
    },
    afterCursorQuery: (rawQuery, cursorData) => {
      if (!rawQuery.id) rawQuery.id = {};
      rawQuery.id.$gt = cursorData.id;
    },
  },
  AGE_ID_DESC: {
    value: { age: -1, id: -1 },
    cursorFields: ['age', 'id'],
    beforeCursorQuery: (rawQuery, cursorData) => {
      if (!rawQuery.age) rawQuery.age = {};
      if (!rawQuery.id) rawQuery.id = {};
      rawQuery.age = { $gt: cursorData.age };
      rawQuery.id = { $gt: cursorData.id };
    },
    afterCursorQuery: (rawQuery, cursorData) => {
      if (!rawQuery.age) rawQuery.age = {};
      if (!rawQuery.id) rawQuery.id = {};
      rawQuery.age = { $lt: cursorData.age };
      rawQuery.id = { $lt: cursorData.id };
    },
  },
};
