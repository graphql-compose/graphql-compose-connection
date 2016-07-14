import { expect } from 'chai';
import { userTypeComposer } from '../../__mocks__/userTypeComposer';
import { TypeComposer } from 'graphql-compose';
import { prepareEdgeType, prepareConnectionType } from '../connectionType';
import GraphQLConnectionCursor from '../cursorType';
import PageInfoType from '../pageInfoType';
import {
  GraphQLNonNull,
  GraphQLObjectType,
  getNamedType,
  GraphQLInt,
  GraphQLList,
} from 'graphql';

describe('types/connectionType.js', () => {
  describe('prepareEdgeType()', () => {
    it('should return GraphQLObjectType', () => {
      expect(prepareEdgeType(userTypeComposer))
        .to.be.instanceof(GraphQLObjectType);
    });

    it('should have name ending with `Edge`', () => {
      expect(prepareEdgeType(userTypeComposer))
        .property('name').to.be.equal('UserEdge');
    });

    it('should have field `node` with provided Type', () => {
      const tc = new TypeComposer(prepareEdgeType(userTypeComposer));
      expect(tc.getFieldType('node')).equal(userTypeComposer.getType());
    });

    it('should have field `cursor` with GraphQLNonNull(GraphQLConnectionCursor)', () => {
      const tc = new TypeComposer(prepareEdgeType(userTypeComposer));
      expect(tc.getFieldType('cursor')).instanceof(GraphQLNonNull);

      const cursor = getNamedType(tc.getFieldType('cursor'));
      expect(cursor).equal(GraphQLConnectionCursor);
    });
  });

  describe('prepareConnectionType()', () => {
    it('should return GraphQLObjectType', () => {
      expect(prepareConnectionType(userTypeComposer))
        .to.be.instanceof(GraphQLObjectType);
    });

    it('should have name ending with `Connection`', () => {
      expect(prepareConnectionType(userTypeComposer))
        .property('name').to.be.equal('UserConnection');
    });

    it('should have field `count` with provided Type', () => {
      const tc = new TypeComposer(prepareConnectionType(userTypeComposer));
      expect(tc.getFieldType('count')).equal(GraphQLInt);
    });

    it('should have field `pageInfo` with GraphQLNonNull(PageInfoType)', () => {
      const tc = new TypeComposer(prepareConnectionType(userTypeComposer));
      expect(tc.getFieldType('pageInfo')).instanceof(GraphQLNonNull);

      const pageInfo = getNamedType(tc.getFieldType('pageInfo'));
      expect(pageInfo).equal(PageInfoType);
    });

    it('should have field `edges` with GraphQLList(EdgeType)', () => {
      const tc = new TypeComposer(prepareConnectionType(userTypeComposer));
      expect(tc.getFieldType('edges')).instanceof(GraphQLList);

      const edges = getNamedType(tc.getFieldType('edges'));
      expect(edges).property('name').equals('UserEdge');
    });
  });
});
