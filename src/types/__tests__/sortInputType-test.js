/* @flow */

import { EnumTypeComposer } from 'graphql-compose';
import { GraphQLEnumType } from 'graphql-compose/lib/graphql';
import { userTypeComposer } from '../../__mocks__/userTypeComposer';
import { prepareSortType } from '../sortInputType';

describe('types/sortInputType.js', () => {
  describe('basic checks', () => {
    it('should throw error if opts.sort are empty', () => {
      expect(() => {
        const wrongArgs: any = [userTypeComposer, {}];
        prepareSortType(...wrongArgs);
      }).toThrowError('Option `sort` should not be empty');
    });

    it('should throw error if opts.sort are empty object', () => {
      expect(() => {
        const wrongArgs: any = [userTypeComposer, { sort: {} }];
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide at least one `sort` option');
    });

    it('should throw error if opts.sort.[KEY].value are empty object', () => {
      expect(() => {
        const wrongArgs: any = [userTypeComposer, { sort: { _ID_ASC: {} } }];
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `value`');
    });

    it('should throw error if opts.sort.[KEY].cursorFields are empty object', () => {
      expect(() => {
        const wrongArgs: any = [userTypeComposer, { sort: { _ID_ASC: { value: { id: 1 } } } }];
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide array of field(s) in `cursorFields`');

      expect(() => {
        const wrongArgs: any = [
          userTypeComposer,
          {
            sort: {
              _ID_ASC: {
                value: { id: 1 },
                cursorFields: 123,
              },
            },
          },
        ];
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide array of field(s) in `cursorFields`');
    });

    it('should throw error if opts.sort.[KEY].beforeCursorQuery are empty object', () => {
      expect(() => {
        const wrongArgs: any = [
          userTypeComposer,
          {
            sort: {
              _ID_ASC: {
                value: { id: 1 },
                cursorFields: ['id'],
              },
            },
          },
        ];
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `beforeCursorQuery`');

      expect(() => {
        const wrongArgs: any = [
          userTypeComposer,
          {
            sort: {
              _ID_ASC: {
                value: { id: 1 },
                cursorFields: ['id'],
                beforeCursorQuery: 123,
              },
            },
          },
        ];
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `beforeCursorQuery`');
    });

    it('should throw error if opts.sort.[KEY].afterCursorQuery are empty object', () => {
      expect(() => {
        const wrongArgs: any = [
          userTypeComposer,
          {
            sort: {
              _ID_ASC: {
                value: { id: 1 },
                cursorFields: ['id'],
                beforeCursorQuery: () => {},
              },
            },
          },
        ];
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `afterCursorQuery`');

      expect(() => {
        const wrongArgs: any = [
          userTypeComposer,
          {
            sort: {
              _ID_ASC: {
                value: { id: 1 },
                cursorFields: ['id'],
                beforeCursorQuery: () => {},
                afterCursorQuery: 123,
              },
            },
          },
        ];
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `afterCursorQuery`');
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

    it('should have name `Sort[resolverName][typeName]Enum`', () => {
      const otherSortType = prepareSortType(userTypeComposer, {
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
        connectionResolverName: 'otherConnection',
      });
      expect(otherSortType.name).toBe('SortOtherConnectionUserEnum');
    });

    it('should have enum values', () => {
      const etc = EnumTypeComposer.create(sortType);
      expect(etc.hasField('_ID_ASC')).toBeTruthy();
    });
  });
});
