/* @flow */

import { schemaComposer, ObjectTypeComposer } from 'graphql-compose';
import {
  GraphQLNonNull,
  getNamedType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql-compose/lib/graphql';
import { userTC } from '../../__mocks__/userTC';
import { prepareEdgeType, prepareConnectionType } from '../connectionType';

describe('types/connectionType.js', () => {
  describe('prepareEdgeType()', () => {
    it('should return ComposeObjectType', () => {
      expect(prepareEdgeType(userTC)).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should have name ending with `Edge`', () => {
      expect(prepareEdgeType(userTC).getTypeName()).toBe('UserEdge');
    });

    it('should have field `node` with provided Type', () => {
      const tc = schemaComposer.createObjectTC(prepareEdgeType(userTC));
      const nodeType: any = tc.getFieldType('node');
      expect(nodeType).toBeInstanceOf(GraphQLNonNull);
      expect(nodeType.ofType).toBe(userTC.getType());
    });

    it('should have field `cursor` with GraphQLNonNull(GraphQLString)', () => {
      const tc = schemaComposer.createObjectTC(prepareEdgeType(userTC));
      expect(tc.getFieldType('cursor')).toBeInstanceOf(GraphQLNonNull);

      const cursor = getNamedType(tc.getFieldType('cursor'));
      expect(cursor).toBe(GraphQLString);
    });

    it('should return same type for same Type in ObjectTypeComposer', () => {
      const t1 = prepareEdgeType(userTC);
      const t2 = prepareEdgeType(userTC);
      expect(t1).toEqual(t2);
    });
  });

  describe('prepareConnectionType()', () => {
    it('should return ComposeObjectType', () => {
      expect(prepareConnectionType(userTC)).toBeInstanceOf(ObjectTypeComposer);
    });

    it('should return the same ComposeObjectType object when called again', () => {
      const firstConnectionType = prepareConnectionType(userTC);
      const secondConnectionType = prepareConnectionType(userTC);
      expect(firstConnectionType).toBeInstanceOf(ObjectTypeComposer);
      expect(firstConnectionType).toBe(secondConnectionType);
    });

    it('should return a separate ComposeObjectType with a different name', () => {
      const connectionType = prepareConnectionType(userTC);
      const otherConnectionType = prepareConnectionType(userTC, 'otherConnection');
      expect(connectionType).toBeInstanceOf(ObjectTypeComposer);
      expect(otherConnectionType).toBeInstanceOf(ObjectTypeComposer);
      expect(connectionType).not.toBe(otherConnectionType);
    });

    it('should have name ending with `Connection`', () => {
      expect(prepareConnectionType(userTC).getTypeName()).toBe('UserConnection');
    });

    it('should have name ending with `OtherConnection` when passed lowercase otherConnection', () => {
      expect(prepareConnectionType(userTC, 'otherConnection').getTypeName()).toBe(
        'UserOtherConnection'
      );
    });

    it('should have field `count` with provided Type', () => {
      const tc = schemaComposer.createObjectTC(prepareConnectionType(userTC));
      const countType: any = tc.getFieldType('count');
      expect(countType).toBeInstanceOf(GraphQLNonNull);
      expect(countType.ofType).toBe(GraphQLInt);
    });

    it('should have field `pageInfo` with GraphQLNonNull(PageInfoType)', () => {
      const tc = schemaComposer.createObjectTC(prepareConnectionType(userTC));
      expect(tc.getFieldType('pageInfo')).toBeInstanceOf(GraphQLNonNull);
      expect(tc.getField('pageInfo').type.getTypeName()).toBe('PageInfo!');
    });

    it('should have field `edges` with GraphQLList(EdgeType)', () => {
      const tc = schemaComposer.createObjectTC(prepareConnectionType(userTC));
      const edgesType: any = tc.getFieldType('edges');
      expect(edgesType).toBeInstanceOf(GraphQLNonNull);
      expect(edgesType.ofType).toBeInstanceOf(GraphQLList);

      const edges: any = getNamedType(tc.getFieldType('edges'));
      expect(edges.name).toEqual('UserEdge');
    });

    it('should return same type for same Type in ObjectTypeComposer', () => {
      const t1 = prepareConnectionType(userTC);
      const t2 = prepareConnectionType(userTC);
      expect(t1).toEqual(t2);
    });
  });
});
