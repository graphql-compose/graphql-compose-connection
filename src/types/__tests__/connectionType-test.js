/* @flow */

import { expect } from 'chai';
import { TypeComposer, graphql } from 'graphql-compose';
import { userTypeComposer } from '../../__mocks__/userTypeComposer';
import { prepareEdgeType, prepareConnectionType } from '../connectionType';
import GraphQLConnectionCursor from '../cursorType';
import PageInfoType from '../pageInfoType';

const { GraphQLNonNull, GraphQLObjectType, getNamedType, GraphQLInt, GraphQLList } = graphql;

describe('types/connectionType.js', () => {
  describe('prepareEdgeType()', () => {
    it('should return GraphQLObjectType', () => {
      expect(prepareEdgeType(userTypeComposer)).to.be.instanceof(GraphQLObjectType);
    });

    it('should have name ending with `Edge`', () => {
      expect(prepareEdgeType(userTypeComposer)).property('name').to.be.equal('UserEdge');
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

    it('should have `ofType` property (like GraphQLList, GraphQLNonNull)', () => {
      const edgeType = prepareEdgeType(userTypeComposer);
      expect(edgeType).property('ofType').equals(userTypeComposer.getType());
    });

    it('should return same type for same Type in TypeComposer', () => {
      const t1 = prepareEdgeType(userTypeComposer);
      const t2 = prepareEdgeType(userTypeComposer);
      expect(t1).equals(t2);
    });
  });

  describe('prepareConnectionType()', () => {
    it('should return GraphQLObjectType', () => {
      expect(prepareConnectionType(userTypeComposer)).to.be.instanceof(GraphQLObjectType);
    });

    it('should have name ending with `Connection`', () => {
      expect(prepareConnectionType(userTypeComposer))
        .property('name')
        .to.be.equal('UserConnection');
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

    it('should have `ofType` property (like GraphQLList, GraphQLNonNull)', () => {
      // this behavior needed for `graphql-compose` module in `projection` helper
      // otherwise it incorrectly construct projectionMapper for tricky fields
      const connectionType = prepareConnectionType(userTypeComposer);
      expect(connectionType).property('ofType').equals(userTypeComposer.getType());
    });

    it('should return same type for same Type in TypeComposer', () => {
      const t1 = prepareConnectionType(userTypeComposer);
      const t2 = prepareConnectionType(userTypeComposer);
      expect(t1).equals(t2);
    });
  });
});
