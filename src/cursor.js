/* @flow */

import type { CursorDataType } from './definition';

export function base64(i: string): string {
  return ((new Buffer(i, 'ascii')).toString('base64'));
}

export function unbase64(i: string): string {
  return ((new Buffer(i, 'base64')).toString('ascii'));
}

export function cursorToData(cursor?: ?string): ?CursorDataType {
  if (cursor) {
    try {
      return JSON.parse(unbase64(cursor)) || null;
    } catch (err) {
      return null;
    }
  }
  return null;
}

export function dataToCursor(data: CursorDataType): string {
  return base64(JSON.stringify(data));
}
