import { ObjectTypeComposer, upperFirst, isFunction, EnumTypeComposer } from 'graphql-compose';
import type { ConnectionSortOpts, ConnectionResolverOpts } from '../connection';

export function prepareSortType<TContext>(
  typeComposer: ObjectTypeComposer<any, TContext>,
  opts: ConnectionResolverOpts<TContext>
): EnumTypeComposer<TContext> {
  if (!opts || !opts.sort) {
    throw new Error('Option `sort` should not be empty in composeWithConnection');
  }

  const typeName = `Sort${upperFirst(opts.name || 'connection')}${typeComposer.getTypeName()}Enum`;

  const sortKeys = Object.keys(opts.sort);
  if (sortKeys.length === 0) {
    throw new Error(
      'You should provide at least one `sort` option ' +
        `for composeWithConnection(${typeComposer.getTypeName()}, opts) in opts.sort`
    );
  }

  const sortEnumValues = {} as Record<string, any>;
  sortKeys.forEach((sortKey) => {
    checkSortOpts(sortKey, opts.sort[sortKey]);

    sortEnumValues[sortKey] = {
      name: sortKey,
      value: opts.sort[sortKey].value,
    };
  });

  const sortType = typeComposer.schemaComposer.createEnumTC({
    name: typeName,
    values: sortEnumValues,
  });

  return sortType;
}

export function checkSortOpts(key: string, opts: ConnectionSortOpts): void {
  if (!opts.value) {
    throw new Error(
      'You should provide `value` ' +
        `for composeWithConnection in opts.sort.${key}. ` +
        'Connections does not work without sorting.'
    );
  }

  if (!opts.cursorFields || !Array.isArray(opts.cursorFields)) {
    throw new Error(
      'You should provide array of field(s) in `cursorFields` ' +
        `for composeWithConnection in opts.sort.${key}` +
        'Ideally this field(s) should be in unique index. ' +
        'Connection will work incorrectly, if some records have same values.'
    );
  }

  if (!opts.beforeCursorQuery || !isFunction(opts.beforeCursorQuery)) {
    throw new Error(
      'You should provide `beforeCursorQuery` function ' +
        `for composeWithConnection in opts.sort.${key}. ` +
        'Connections should have ability to filter ' +
        'backward records started from cursor.'
    );
  }

  if (!opts.afterCursorQuery || !isFunction(opts.afterCursorQuery)) {
    throw new Error(
      'You should provide `afterCursorQuery` function ' +
        `for composeWithConnection in opts.sort.${key}. ` +
        'Connections should have ability to filter ' +
        'forward records started from cursor.'
    );
  }
}
