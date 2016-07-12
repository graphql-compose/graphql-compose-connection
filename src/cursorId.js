/* @flow */

import type {
  Base64String,
} from './definition.js';

export function base64(i: string): Base64String {
  return ((new Buffer(i, 'ascii')).toString('base64'));
}

export function unbase64(i: Base64String): string {
  return ((new Buffer(i, 'base64')).toString('ascii'));
}

/**
 * Takes a type name and an ID specific to that type name, and returns a
 * "cursor ID" that is unique among all types.
 */
export function toCursorId(prefix: string, filter: string): string {
  return base64([prefix, id].join(':'));
}

/**
 * Takes the "cursor ID" created by toCursorId, and returns the type name and ID
 * used to create it.
 */
export function fromCursorId(cursorId: string): ResolvedGlobalId {
  const unbasedCursorId = unbase64(cursorId);
  const delimiterPos = unbasedCursorId.indexOf(':');
  return {
    prefix: unbasedCursorId.substring(0, delimiterPos),
    id: unbasedCursorId.substring(delimiterPos + 1),
  };
}
