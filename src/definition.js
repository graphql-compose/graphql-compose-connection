/* @flow */
/* eslint-disable */

import type {
  ResolveParams as _ResolveParams,
} from 'graphql-compose/lib/definition.js';

export type composeWithConnectionOpts = {
  findResolverName: string,
  countResolverName: string,
  sort: connectionSortMapOpts,
};

export type connectionSortMapOpts = {
  [sortName: string]: connectionSortOpts,
};

export type connectionSortOpts = {
  value: mixed,
  cursorFields: string[],
  beforeCursorQuery: (rawQuery: mixed, cursorData: CursorDataType, resolveParams: ResolveParams) => void,
  afterCursorQuery: (rawQuery: mixed, cursorData: CursorDataType, resolveParams: ResolveParams) => void,
};

export type ResolveParams = _ResolveParams;

export type ConnectionResolveParams = {
  source: mixed,
  args: {
    first?: ?number,
    after?: string,
    last?: ?number,
    before?: string,
    sort: connectionSortOpts,
    [argName: string]: mixed,
  },
  context: mixed,
  info: any,
  projection: { [fieldName: string]: true },
  [opt: string]: mixed,
};

export type CursorDataType = {
  [fieldName: string]: mixed,
};

export type GraphQLConnectionType = {
  count: number,
  edges: [GraphQLConnectionEdgeType] | [],
  pageInfo: PageInfoType,
}

export type GraphQLConnectionEdgeType = {
  cursor: string,
  node: mixed,
}

export type PageInfoType = {
  startCursor: string,
  endCursor: string,
  hasPreviousPage: boolean,
  hasNextPage: boolean,
}
