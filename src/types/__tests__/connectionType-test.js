/* @flow */

import { TypeComposer } from 'graphql-compose';
import {
  GraphQLNonNull,
  GraphQLObjectType,
  getNamedType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql-compose/lib/graphql';
import { userTypeComposer } from '../../__mocks__/userTypeComposer';
import { prepareEdgeType, prepareConnectionType } from '../connectionType';
import PageInfoType from '../pageInfoType';

describe('types/connectionType.js', () => {
  describe('prepareEdgeType()', () => {
    it('should return GraphQLObjectType', () => {
      expect(prepareEdgeType(userTypeComposer)).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have name ending with `Edge`', () => {
      expect(prepareEdgeType(userTypeComposer).name).toBe('UserEdge');
    });

    it('should have field `node` with provided Type', () => {
      const tc = new TypeComposer(prepareEdgeType(userTypeComposer));
      expect(tc.getFieldType('node')).toBeInstanceOf(GraphQLNonNull);
      expect(tc.getFieldType('node').ofType).toBe(userTypeComposer.getType());
    });

    it('should have field `cursor` with GraphQLNonNull(GraphQLString)', () => {
      const tc = new TypeComposer(prepareEdgeType(userTypeComposer));
      expect(tc.getFieldType('cursor')).toBeInstanceOf(GraphQLNonNull);

      const cursor = getNamedType(tc.getFieldType('cursor'));
      expect(cursor).toBe(GraphQLString);
    });

    it('should have `ofType` property (like GraphQLList, GraphQLNonNull)', () => {
      const edgeType = prepareEdgeType(userTypeComposer);
      // $FlowFixMe
      expect(edgeType.ofType).toEqual(userTypeComposer.getType());
    });

    it('should return same type for same Type in TypeComposer', () => {
      const t1 = prepareEdgeType(userTypeComposer);
      const t2 = prepareEdgeType(userTypeComposer);
      expect(t1).toEqual(t2);
    });
  });

  describe('prepareConnectionType()', () => {
    it('should return GraphQLObjectType', () => {
      expect(prepareConnectionType(userTypeComposer)).toBeInstanceOf(GraphQLObjectType);
    });

    it('should have name ending with `Connection`', () => {
      expect(prepareConnectionType(userTypeComposer).name).toBe('UserConnection');
    });

    it('should have field `count` with provided Type', () => {
      const tc = new TypeComposer(prepareConnectionType(userTypeComposer));
      expect(tc.getFieldType('count')).toBe(GraphQLInt);
    });

    it('should have field `pageInfo` with GraphQLNonNull(PageInfoType)', () => {
      const tc = new TypeComposer(prepareConnectionType(userTypeComposer));
      expect(tc.getFieldType('pageInfo')).toBeInstanceOf(GraphQLNonNull);

      const pageInfo = getNamedType(tc.getFieldType('pageInfo'));
      expect(pageInfo).toBe(PageInfoType);
    });

    it('should have field `edges` with GraphQLList(EdgeType)', () => {
      const tc = new TypeComposer(prepareConnectionType(userTypeComposer));
      expect(tc.getFieldType('edges')).toBeInstanceOf(GraphQLNonNull);
      expect(tc.getFieldType('edges').ofType).toBeInstanceOf(GraphQLList);

      const edges = getNamedType(tc.getFieldType('edges'));
      // $FlowFixMe
      expect(edges.name).toEqual('UserEdge');
    });

    it('should have `ofType` property (like GraphQLList, GraphQLNonNull)', () => {
      // this behavior needed for `graphql-compose` module in `projection` helper
      // otherwise it incorrectly construct projectionMapper for tricky fields
      const connectionType = prepareConnectionType(userTypeComposer);
      // $FlowFixMe
      expect(connectionType.ofType).toEqual(userTypeComposer.getType());
    });

    it('should return same type for same Type in TypeComposer', () => {
      const t1 = prepareConnectionType(userTypeComposer);
      const t2 = prepareConnectionType(userTypeComposer);
      expect(t1).toEqual(t2);
    });
  });
});
