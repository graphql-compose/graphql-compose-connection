/* @flow */

import { graphql } from 'graphql-compose';
import { userTypeComposer } from '../../__mocks__/userTypeComposer';
import { prepareSortType } from '../sortInputType';

const { GraphQLEnumType } = graphql;

describe('types/sortInputType.js', () => {
  describe('basic checks', () => {
    it('should throw error if opts.sort are empty', () => {
      // $FlowFixMe
      expect(() => prepareSortType(userTypeComposer, {})).toThrowError(
        'Option `sort` should not be empty'
      );
    });

    it('should throw error if opts.sort are empty object', () => {
      expect(() =>
        // $FlowFixMe
        prepareSortType(userTypeComposer, {
          sort: {},
        })
      ).toThrowError('should provide at least one `sort` option');
    });

    it('should throw error if opts.sort.[KEY].value are empty object', () => {
      expect(() =>
        // $FlowFixMe
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {},
          },
        })
      ).toThrowError('should provide `value`');
    });

    it('should throw error if opts.sort.[KEY].cursorFields are empty object', () => {
      expect(() =>
        // $FlowFixMe
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
            },
          },
        })
      ).toThrowError('should provide array of field(s) in `cursorFields`');

      expect(() =>
        // $FlowFixMe
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: 123,
            },
          },
        })
      ).toThrowError('should provide array of field(s) in `cursorFields`');
    });

    it('should throw error if opts.sort.[KEY].beforeCursorQuery are empty object', () => {
      expect(() =>
        // $FlowFixMe
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: ['id'],
            },
          },
        })
      ).toThrowError('should provide `beforeCursorQuery`');

      expect(() =>
        // $FlowFixMe
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: ['id'],
              beforeCursorQuery: 123,
            },
          },
        })
      ).toThrowError('should provide `beforeCursorQuery`');
    });

    it('should throw error if opts.sort.[KEY].afterCursorQuery are empty object', () => {
      expect(() =>
        // $FlowFixMe
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: ['id'],
              beforeCursorQuery: () => {},
            },
          },
        })
      ).toThrowError('should provide `afterCursorQuery`');

      expect(() =>
        // $FlowFixMe
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: ['id'],
              beforeCursorQuery: () => {},
              afterCursorQuery: 123,
            },
          },
        })
      ).toThrowError('should provide `afterCursorQuery`');
    });
  });

  describe('returned SortType', () => {
    const sortType = prepareSortType(userTypeComposer, {
      sort: {
        _ID_ASC: {
          value: { id: 1 },
          cursorFields: ['id'],
          beforeCursorQuery: () => {},
          afterCursorQuery: () => {},
        },
      },
      findResolverName: 'finMany',
      countResolverName: 'count',
    });

    it('should be GraphQLEnumType', () => {
      expect(sortType).toBeInstanceOf(GraphQLEnumType);
    });

    it('should have name `SortConnection[typeName]Enum`', () => {
      expect(sortType.name).toBe('SortConnectionUserEnum');
    });

    it('should have enum values', () => {
      expect(sortType._enumConfig.values._ID_ASC).toBeTruthy();
    });
  });
});
