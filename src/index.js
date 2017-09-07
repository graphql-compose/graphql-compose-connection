/* @flow */

import { composeWithConnection } from './composeWithConnection';
import { cursorToData, dataToCursor } from './cursor';

export default composeWithConnection;

export { composeWithConnection, cursorToData, dataToCursor };

export type { ComposeWithConnectionOpts } from './composeWithConnection';
export type { ConnectionSortOpts, ConnectionSortMapOpts } from './connectionResolver';
