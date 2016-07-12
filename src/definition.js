/* @flow */
/* eslint-disable */

export type CursorData = {
  [fieldName: string]: mixed,
};

export type connectionSortOpts = {
  resolver: string,
  uniqueFields: string[],
  sortValue: mixed,
  cursorToFilter: (<T>(cursorData: CursorData, filterArg: T) => T),
};

export type connectionSortMapOpts = {
  [sortName: string]: connectionSortOpts,
};

export type composeWithConnectionOpts = {
  sort: connectionSortMapOpts,
};
