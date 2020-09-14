import { UserTC } from '../../__mocks__/User';
import { prepareSortType } from '../sortInputType';

describe('types/sortInputType.js', () => {
  describe('basic checks', () => {
    it('should throw error if opts.sort are empty', () => {
      expect(() => {
        const wrongArgs = [UserTC, {}];
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('Option `sort` should not be empty');
    });

    it('should throw error if opts.sort are empty object', () => {
      expect(() => {
        const wrongArgs = [UserTC, { sort: {} }];
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide at least one `sort` option');
    });

    it('should throw error if opts.sort.[KEY].value are empty object', () => {
      expect(() => {
        const wrongArgs = [UserTC, { sort: { _ID_ASC: {} } }];
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `value`');
    });

    it('should throw error if opts.sort.[KEY].cursorFields are empty object', () => {
      expect(() => {
        const wrongArgs = [UserTC, { sort: { _ID_ASC: { value: { id: 1 } } } }];
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide array of field(s) in `cursorFields`');

      expect(() => {
        const wrongArgs = [
          UserTC,
          {
            sort: {
              _ID_ASC: {
                value: { id: 1 },
                cursorFields: 123,
              },
            },
          },
        ];
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide array of field(s) in `cursorFields`');
    });

    it('should throw error if opts.sort.[KEY].beforeCursorQuery are empty object', () => {
      expect(() => {
        const wrongArgs = [
          UserTC,
          {
            sort: {
              _ID_ASC: {
                value: { id: 1 },
                cursorFields: ['id'],
              },
            },
          },
        ];
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `beforeCursorQuery`');

      expect(() => {
        const wrongArgs = [
          UserTC,
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
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `beforeCursorQuery`');
    });

    it('should throw error if opts.sort.[KEY].afterCursorQuery are empty object', () => {
      expect(() => {
        const wrongArgs = [
          UserTC,
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
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `afterCursorQuery`');

      expect(() => {
        const wrongArgs = [
          UserTC,
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
        // @ts-expect-error
        prepareSortType(...wrongArgs);
      }).toThrowError('should provide `afterCursorQuery`');
    });
  });
});
