/* @flow */
/* eslint-disable */

import type {
  ResolveParams as _ResolveParams,
  GraphQLArgumentConfig as _GraphQLArgumentConfig,
  GraphQLResolveInfo,
  ProjectionType,
} from "graphql-compose/lib/definition.js";

export type ComposeWithConnectionOpts = {
  findResolverName: string,
  countResolverName: string,
  sort: ConnectionSortMapOpts,
};

export type ConnectionSortMapOpts = {
  [sortName: string]: ConnectionSortOpts,
};

export type ConnectionSortOpts = {
  value: any,
  cursorFields: string[],
  beforeCursorQuery: (
    rawQuery: any,
    cursorData: CursorDataType,
    resolveParams: ConnectionResolveParams<*, *>
  ) => any,
  afterCursorQuery: (
    rawQuery: any,
    cursorData: CursorDataType,
    resolveParams: ConnectionResolveParams<*, *>
  ) => any,
};

export type GraphQLArgumentConfig = _GraphQLArgumentConfig;
export type ResolveParams<TSource, TContext> = _ResolveParams<
  TSource,
  TContext
>;

export type ConnectionResolveParams<TSource, TContext> = {
  source: TSource,
  args: {
    first?: ?number,
    after?: string,
    last?: ?number,
    before?: string,
    sort?: ConnectionSortOpts,
    filter?: { [fieldName: string]: any },
    [argName: string]: any,
  },
  context: TContext,
  info: GraphQLResolveInfo,
  projection: $Shape<ProjectionType>,
  [opt: string]: any,
};

export type CursorDataType =
  | {
      [fieldName: string]: any,
    }
  | any;

export type GraphQLConnectionType = {
  count: number,
  edges: GraphQLConnectionEdgeType[],
  pageInfo: PageInfoType,
};

export type GraphQLConnectionEdgeType = {
  cursor: string,
  node: mixed,
};

export type PageInfoType = {
  startCursor: string,
  endCursor: string,
  hasPreviousPage: boolean,
  hasNextPage: boolean,
};
