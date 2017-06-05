/* @flow */

import { expect } from 'chai';
import { graphql } from 'graphql-compose';
import { userTypeComposer } from '../../__mocks__/userTypeComposer';
import { prepareSortType } from '../sortInputType';

const { GraphQLEnumType } = graphql;

describe('types/sortInputType.js', () => {
  describe('basic checks', () => {
    it('should throw error if opts.sort are empty', () => {
      expect(() => prepareSortType(userTypeComposer, {})).to.throw(
        'Option `sort` should not be empty'
      );
    });

    it('should throw error if opts.sort are empty object', () => {
      expect(() =>
        prepareSortType(userTypeComposer, {
          sort: {},
        })
      ).to.throw('should provide at least one `sort` option');
    });

    it('should throw error if opts.sort.[KEY].value are empty object', () => {
      expect(() =>
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {},
          },
        })
      ).to.throw('should provide `value`');
    });

    it('should throw error if opts.sort.[KEY].cursorFields are empty object', () => {
      expect(() =>
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
            },
          },
        })
      ).to.throw('should provide array of field(s) in `cursorFields`');

      expect(() =>
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: 123,
            },
          },
        })
      ).to.throw('should provide array of field(s) in `cursorFields`');
    });

    it('should throw error if opts.sort.[KEY].beforeCursorQuery are empty object', () => {
      expect(() =>
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: ['id'],
            },
          },
        })
      ).to.throw('should provide `beforeCursorQuery`');

      expect(() =>
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: ['id'],
              beforeCursorQuery: 123,
            },
          },
        })
      ).to.throw('should provide `beforeCursorQuery`');
    });

    it('should throw error if opts.sort.[KEY].afterCursorQuery are empty object', () => {
      expect(() =>
        prepareSortType(userTypeComposer, {
          sort: {
            _ID_ASC: {
              value: { id: 1 },
              cursorFields: ['id'],
              beforeCursorQuery: () => {},
            },
          },
        })
      ).to.throw('should provide `afterCursorQuery`');

      expect(() =>
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
      ).to.throw('should provide `afterCursorQuery`');
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
    });

    it('should be GraphQLEnumType', () => {
      expect(sortType).to.be.instanceof(GraphQLEnumType);
    });

    it('should have name `SortConnection[typeName]Enum`', () => {
      expect(sortType).property('name').to.be.equal('SortConnectionUserEnum');
    });

    it('should have enum values', () => {
      expect(sortType).nested.property('_enumConfig.values._ID_ASC').to.be.ok;
    });
  });
});
