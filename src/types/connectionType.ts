import {
  ListComposer,
  ObjectTypeComposer,
  NonNullComposer,
  upperFirst,
  SchemaComposer,
  ObjectTypeComposerFieldConfigMap,
} from 'graphql-compose';

// This is required due compatibility with old client code bases
const globalPageInfoTypes = {} as Record<string, ObjectTypeComposer>;

export type ConnectionType = {
  count: number;
  edges: ConnectionEdgeType[];
  pageInfo: PageInfoType;
};

export type ConnectionEdgeType = {
  cursor: string;
  node: any;
};

export type PageInfoType = {
  startCursor: string;
  endCursor: string;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

function createGlobalPageInfoType(name: string) {
  if (!globalPageInfoTypes[name]) {
    globalPageInfoTypes[name] = ObjectTypeComposer.createTemp(`
      """Information about pagination in a connection."""
      type ${name} {
        """When paginating forwards, are there more items?"""
        hasNextPage: Boolean!
        
        """When paginating backwards, are there more items?"""
        hasPreviousPage: Boolean!

        """When paginating backwards, the cursor to continue."""
        startCursor: String

        """When paginating forwards, the cursor to continue."""
        endCursor: String
      }
    `);
  }
  return globalPageInfoTypes[name];
}

export function preparePageInfoType(
  schemaComposer: SchemaComposer<any>,
  name: string = 'PageInfo'
): ObjectTypeComposer<any, any> {
  if (schemaComposer.has(name)) {
    return schemaComposer.getOTC(name);
  }
  const tc = createGlobalPageInfoType(name);
  schemaComposer.set(name, tc);
  return tc;
}

export function prepareEdgeType<TContext>(
  nodeTypeComposer: ObjectTypeComposer<any, TContext>,
  edgeTypeName?: string,
  edgeFields?: ObjectTypeComposerFieldConfigMap<any, TContext>
): ObjectTypeComposer<any, TContext> {
  const name = edgeTypeName || `${nodeTypeComposer.getTypeName()}Edge`;

  if (nodeTypeComposer.schemaComposer.has(name)) {
    return nodeTypeComposer.schemaComposer.getOTC(name);
  }

  const edgeType = nodeTypeComposer.schemaComposer.createObjectTC({
    name,
    description: 'An edge in a connection.',
    fields: {
      ...edgeFields,
      node: {
        type: new NonNullComposer(nodeTypeComposer),
        description: 'The item at the end of the edge',
      },
      cursor: {
        type: 'String!',
        description: 'A cursor for use in pagination',
      },
    },
  });

  return edgeType;
}

export function prepareConnectionType<TContext>(
  typeComposer: ObjectTypeComposer<any, TContext>,
  resolverName?: string,
  edgeTypeName?: string,
  edgeFields?: ObjectTypeComposerFieldConfigMap<any, TContext>
): ObjectTypeComposer<any, TContext> {
  const name = `${typeComposer.getTypeName()}${upperFirst(resolverName || 'connection')}`;

  if (typeComposer.schemaComposer.has(name)) {
    return typeComposer.schemaComposer.getOTC(name);
  }

  const connectionType = typeComposer.schemaComposer.createObjectTC({
    name,
    description: 'A connection to a list of items.',
    fields: {
      count: {
        type: 'Int!',
        description: 'Total object count.',
      },
      pageInfo: {
        type: new NonNullComposer(preparePageInfoType(typeComposer.schemaComposer)),
        description: 'Information to aid in pagination.',
      },
      edges: {
        type: new NonNullComposer(
          new ListComposer(
            new NonNullComposer(prepareEdgeType(typeComposer, edgeTypeName, edgeFields))
          )
        ),
        description: 'Information to aid in pagination.',
      },
    },
  });

  return connectionType;
}
