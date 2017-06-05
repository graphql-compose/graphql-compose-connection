/* @flow */
/* eslint-disable */

import type {
  ResolveParams as _ResolveParams,
  GraphQLArgumentConfig as _GraphQLArgumentConfig,
  GraphQLResolveInfo,
  ProjectionType,
} from "graphql-compose/lib/definition.js";

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
  beforeCursorQuery: (
    rawQuery: mixed,
    cursorData: CursorDataType,
    resolveParams: ConnectionResolveParams<*, *>
  ) => void,
  afterCursorQuery: (
    rawQuery: mixed,
    cursorData: CursorDataType,
    resolveParams: ConnectionResolveParams<*, *>
  ) => void,
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
    sort: connectionSortOpts,
    filter: { [fieldName: string]: mixed },
    [argName: string]: mixed,
  },
  context: TContext,
  info: GraphQLResolveInfo,
  projection: $Shape<ProjectionType>,
  [opt: string]: mixed,
};

export type CursorDataType =
  | {
      [fieldName: string]: mixed,
    }
  | number;

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
