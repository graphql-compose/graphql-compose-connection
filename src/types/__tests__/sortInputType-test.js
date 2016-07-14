import { expect } from 'chai';
import { userTypeComposer } from '../../__mocks__/userTypeComposer';
import { prepareSortType } from '../sortInputType';
import {
  GraphQLEnumType,
} from 'graphql';

describe('types/sortInputType.js', () => {
  describe('basic checks', () => {
    it('should throw error if opts.sort are empty', () => {
      expect(() => prepareSortType(userTypeComposer, {}))
        .to.throw('Option `sort` should not be empty');
    });

    it('should throw error if opts.sort are empty object', () => {
      expect(() => prepareSortType(userTypeComposer, {
        sort: {},
      })).to.throw('should provide at least one `sort` option');
    });

    it('should throw error if opts.sort.[KEY].uniqueFields are empty object', () => {
      expect(() => prepareSortType(userTypeComposer, {
        sort: {
          _ID_ASC: {},
        },
      })).to.throw('should provide array of field(s) in `uniqueFields`');

      expect(() => prepareSortType(userTypeComposer, {
        sort: {
          _ID_ASC: {
            uniqueFields: 123,
          },
        },
      })).to.throw('should provide array of field(s) in `uniqueFields`');
    });

    it('should throw error if opts.sort.[KEY].sortValue are empty object', () => {
      expect(() => prepareSortType(userTypeComposer, {
        sort: {
          _ID_ASC: {
            uniqueFields: ['id'],
          },
        },
      })).to.throw('should provide `sortValue`');
    });

    it('should throw error if opts.sort.[KEY].directionFilter are empty object', () => {
      expect(() => prepareSortType(userTypeComposer, {
        sort: {
          _ID_ASC: {
            uniqueFields: ['id'],
            sortValue: { id: 1 },
          },
        },
      })).to.throw('should provide `directionFilter`');

      expect(() => prepareSortType(userTypeComposer, {
        sort: {
          _ID_ASC: {
            uniqueFields: ['id'],
            sortValue: { id: 1 },
            directionFilter: 123,
          },
        },
      })).to.throw('should provide `directionFilter`');
    });
  });

  describe('returned SortType', () => {
    const sortType = prepareSortType(userTypeComposer, {
      sort: {
        _ID_ASC: {
          uniqueFields: ['id'],
          sortValue: { id: 1 },
          directionFilter: () => 123,
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
      expect(sortType).deep.property('_enumConfig.values._ID_ASC').to.be.ok;
    });
  });
});
