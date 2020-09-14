import { ObjectTypeComposer } from 'graphql-compose';
import { UserTC } from '../../__mocks__/User';
import { prepareEdgeType, prepareConnectionType } from '../connectionType';

describe('types/connectionType.js', () => {
  describe('prepareEdgeType()', () => {
    it('should return ComposeObjectType', () => {
      expect(prepareEdgeType(UserTC)).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should have name ending with `Edge`', () => {
      expect(prepareEdgeType(UserTC).getTypeName()).toBe('UserEdge');
    });

    it('should have field `node` with provided Type', () => {
      const tc = prepareEdgeType(UserTC);
      expect(tc.isFieldNonNull('node')).toBeTruthy();
      expect(tc.getFieldTC('node')).toBe(UserTC);
    });

    it('should have field `cursor` with GraphQLNonNull(GraphQLString)', () => {
      const tc = prepareEdgeType(UserTC);
      expect(tc.getFieldTypeName('cursor')).toBe('String!');
    });

    it('should return same type for same Type in ObjectTypeComposer', () => {
      const t1 = prepareEdgeType(UserTC);
      const t2 = prepareEdgeType(UserTC);
      expect(t1).toEqual(t2);
    });

    it('should return different type for same Type in ObjectTypeComposer if passed with different edgeType param', () => {
      const t1 = prepareEdgeType(UserTC);
      const t2 = prepareEdgeType(UserTC, 'UserEdge2');
      expect(t1).not.toEqual(t2);
    });
  });

  describe('prepareConnectionType()', () => {
    it('should return ComposeObjectType', () => {
      expect(prepareConnectionType(UserTC)).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should return the same ComposeObjectType object when called again', () => {
      const firstConnectionType = prepareConnectionType(UserTC);
      const secondConnectionType = prepareConnectionType(UserTC);
      expect(firstConnectionType).toBeInstanceOf(ObjectTypeComposer);
      expect(firstConnectionType).toBe(secondConnectionType);
    });

    it('should return a separate ComposeObjectType with a different name', () => {
      const connectionType = prepareConnectionType(UserTC);
      const otherConnectionType = prepareConnectionType(UserTC, 'otherConnection');
      expect(connectionType).toBeInstanceOf(ObjectTypeComposer);
      expect(otherConnectionType).toBeInstanceOf(ObjectTypeComposer);
      expect(connectionType).not.toBe(otherConnectionType);
    });

    it('should have name ending with `Connection`', () => {
      expect(prepareConnectionType(UserTC).getTypeName()).toBe('UserConnection');
    });

    it('should have name ending with `OtherConnection` when passed lowercase otherConnection', () => {
      expect(prepareConnectionType(UserTC, 'otherConnection').getTypeName()).toBe(
        'UserOtherConnection'
      );
    });

    it('should have field `count` with provided Type', () => {
      const tc = prepareConnectionType(UserTC);
      expect(tc.getFieldTypeName('count')).toBe('Int!');
    });

    it('should have field `pageInfo` with GraphQLNonNull(PageInfoType)', () => {
      const tc = prepareConnectionType(UserTC);
      expect(tc.getFieldTypeName('pageInfo')).toBe('PageInfo!');
    });

    it('should have field `edges` with GraphQLList(EdgeType)', () => {
      const tc = prepareConnectionType(UserTC);
      expect(tc.getFieldTypeName('edges')).toEqual('[UserEdge!]!');
    });

    it('should return same type for same Type in ObjectTypeComposer', () => {
      const t1 = prepareConnectionType(UserTC);
      const t2 = prepareConnectionType(UserTC);
      expect(t1).toEqual(t2);
    });
  });
});
