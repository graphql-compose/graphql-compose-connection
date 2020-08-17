import {
  ObjectTypeComposer,
  inspect,
  Resolver,
  ResolverResolveParams,
  ProjectionType,
  ObjectTypeComposerArgumentConfigMap,
  ObjectTypeComposerFieldConfigMap,
} from 'graphql-compose';
import type { GraphQLResolveInfo } from 'graphql-compose/lib/graphql';
import { prepareConnectionType } from './types/connectionType';
import { prepareSortType } from './types/sortInputType';
import { cursorToData, dataToCursor, CursorDataType } from './cursor';

export type ComposeWithConnectionOpts<TContext> = {
  connectionResolverName?: string;
  findResolverName: string;
  countResolverName: string;
  sort: ConnectionSortMapOpts;
  defaultLimit?: number | undefined;
  edgeTypeName?: string;
  edgeFields?: ObjectTypeComposerFieldConfigMap<any, TContext>;
};

export type ConnectionSortOpts = {
  value: any;
  cursorFields: string[];
  beforeCursorQuery: (
    rawQuery: any,
    cursorData: CursorDataType,
    resolveParams: Partial<ConnectionResolveParams<any>>
  ) => any;
  afterCursorQuery: (
    rawQuery: any,
    cursorData: CursorDataType,
    resolveParams: Partial<ConnectionResolveParams<any>>
  ) => any;
};

export type ConnectionSortMapOpts = {
  [sortName: string]: ConnectionSortOpts;
};

export type ConnectionResolveParams<TContext = any> = {
  source: any;
  args: {
    first?: number | null;
    after?: string;
    last?: number | null;
    before?: string;
    sort?: ConnectionSortOpts;
    filter?: { [fieldName: string]: any };
    [argName: string]: any;
  };
  context: TContext;
  info: GraphQLResolveInfo;
  projection: Partial<ProjectionType>;
  [opt: string]: any;
};

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

export function prepareConnectionResolver<TSource, TContext>(
  tc: ObjectTypeComposer<TSource, TContext>,
  opts: ComposeWithConnectionOpts<TContext>
): Resolver<TSource, TContext> {
  if (!(tc instanceof ObjectTypeComposer)) {
    throw new Error(
      `First arg for prepareConnectionResolver() should be instance of ObjectTypeComposer but recieved: ${inspect(
        tc
      )}`
    );
  }

  if (!opts.countResolverName) {
    throw new Error(
      `ObjectTypeComposer(${tc.getTypeName()}) provided to composeWithConnection ` +
        'should have option `opts.countResolverName`.'
    );
  }
  const countResolver = tc.getResolver(opts.countResolverName);
  if (!countResolver) {
    throw new Error(
      `ObjectTypeComposer(${tc.getTypeName()}) provided to composeWithConnection ` +
        `should have resolver with name '${opts.countResolverName}' ` +
        'due opts.countResolverName.'
    );
  }
  const countResolve = countResolver.getResolve();

  if (!opts.findResolverName) {
    throw new Error(
      `ObjectTypeComposer(${tc.getTypeName()}) provided to composeWithConnection ` +
        'should have option `opts.findResolverName`.'
    );
  }
  const findManyResolver = tc.getResolver(opts.findResolverName);
  if (!findManyResolver) {
    throw new Error(
      `ObjectTypeComposer(${tc.getTypeName()}) provided to composeWithConnection ` +
        `should have resolver with name '${opts.findResolverName}' ` +
        'due opts.countResolverName.'
    );
  }
  const findManyResolve = findManyResolver.getResolve();

  const additionalArgs: ObjectTypeComposerArgumentConfigMap = {};
  if (findManyResolver.hasArg('filter')) {
    const filter: any = findManyResolver.getArg('filter');
    if (filter) {
      additionalArgs.filter = filter;
    }
  }

  const sortEnumType = prepareSortType(tc, opts);
  const firstField = sortEnumType.getFieldNames()[0];
  const defaultValue = firstField && sortEnumType.getField(firstField).value;

  return tc.schemaComposer.createResolver({
    type: prepareConnectionType(
      tc,
      opts.connectionResolverName,
      opts.edgeTypeName,
      opts.edgeFields
    ),
    name: opts.connectionResolverName || 'connection',
    kind: 'query',
    args: {
      first: {
        type: 'Int',
        description: 'Forward pagination argument for returning at most first edges',
      },
      after: {
        type: 'String',
        description: 'Forward pagination argument for returning at most first edges',
      },
      last: {
        type: 'Int',
        description: 'Backward pagination argument for returning at most last edges',
      },
      before: {
        type: 'String',
        description: 'Backward pagination argument for returning at most last edges',
      },
      ...(additionalArgs as any),
      sort: {
        type: sortEnumType,
        defaultValue,
        description: 'Sort argument for data ordering',
      },
    } as any,
    async resolve(resolveParams: ConnectionResolveParams<TContext>) {
      let countPromise;
      let findManyPromise;
      const { projection = {}, args, rawQuery } = resolveParams;
      const findManyParams = {
        ...resolveParams,
      } as ResolverResolveParams<any, TContext>;

      let first = parseInt(args.first as any, 10) || 0;
      if (first < 0) {
        throw new Error('Argument `first` should be non-negative number.');
      }
      const last = parseInt(args.last as any, 10) || 0;
      if (last < 0) {
        throw new Error('Argument `last` should be non-negative number.');
      }

      const countParams: ResolverResolveParams<any, TContext, any> = {
        ...resolveParams,
        rawQuery,
        args: {
          filter: { ...resolveParams.args.filter },
        },
      };

      if (projection.count) {
        countPromise = countResolve(countParams);
      } else if (!first && last) {
        countPromise = countResolve(countParams);
      } else {
        countPromise = Promise.resolve(0);
      }

      if (projection && projection.edges) {
        // combine top level projection
        // (maybe somebody add additional fields via resolveParams.projection)
        // and edges.node (record needed fields)
        const extraProjection = opts.edgeFields ? projection.edges : projection.edges.node;
        findManyParams.projection = { ...projection, ...extraProjection };
      } else {
        findManyParams.projection = { ...projection };
      }

      // Apply the rawQuery to the count to get accurate results with last and
      // before
      const sortConfig = findSortConfig(opts.sort, args.sort);
      if (sortConfig) {
        prepareRawQuery(resolveParams, sortConfig);
      }

      if (!first && last) {
        // Get the number of edges targeted by the findMany resolver (not the
        // whole count)
        const filteredCountParams: ResolverResolveParams<any, TContext> = {
          ...resolveParams,
          args: {
            filter: { ...resolveParams.args.filter },
          },
        };

        first = await countResolve(filteredCountParams);
        first = parseInt(first as any, 10) || 0;
      }

      let limit = last || first || opts.defaultLimit || 20;
      let skip = last > 0 ? first - last : 0;

      let prepareCursorData: (record: any) => Record<string, any> | number;
      if (sortConfig) {
        findManyParams.rawQuery = resolveParams.rawQuery;
        sortConfig.cursorFields.forEach((fieldName) => {
          findManyParams.projection[fieldName] = true;
        });

        prepareCursorData = (record) => {
          const result = {} as Record<string, any>;
          sortConfig.cursorFields.forEach((fieldName) => {
            result[fieldName] = record[fieldName];
          });
          return result;
        };
      } else {
        [limit, skip] = prepareLimitSkipFallback(resolveParams, limit, skip);

        let skipIdx = -1;
        prepareCursorData = (_) => {
          skipIdx += 1;
          return skip + skipIdx;
        };
      }

      findManyParams.args.limit = limit + 1; // +1 document, to check next page presence
      if (skip > 0) {
        findManyParams.args.skip = skip;
      }

      // pass findMany ResolveParams to top resolver
      resolveParams.findManyResolveParams = findManyParams;
      resolveParams.countResolveParams = countParams;

      // This allows to optimize and not actually call the findMany resolver
      // if only the count is projected
      if (projection.count && Object.keys(projection).length === 1) {
        findManyPromise = Promise.resolve([]);
      } else {
        findManyPromise = findManyResolve(findManyParams);
      }

      return Promise.all([findManyPromise, countPromise])
        .then(([recordList, count]) => {
          // transform record to object { cursor, node, ...edge}
          const edges = recordList.map((record: any) => {
            const edge = {
              cursor: dataToCursor(prepareCursorData(record)),
              node: opts.edgeFields ? record.node : record,
            } as Record<string, any>;
            if (opts.edgeFields) {
              // Sometimes the value from `findMany` can't be spread
              Object.keys(opts.edgeFields).forEach((field) => {
                edge[field] = record[field];
              });
            }
            return edge;
          });
          return [edges, count];
        })
        .then(([edges, count]) => {
          const result = emptyConnection();
          result.edges = edges.length > limit ? edges.slice(0, limit) : edges;

          result.pageInfo = preparePageInfo(edges, args, limit, skip);
          result.count = count;

          return result;
        });
    },
  });
}

export function preparePageInfo(
  edges: { cursor: string; [key: string]: any }[],
  args: {
    last?: number | null;
    first?: number | null;
    after?: string;
    before?: string;
  },
  limit: number,
  skip: number
): PageInfoType {
  const pageInfo = {
    startCursor: '',
    endCursor: '',
    hasPreviousPage: false,
    hasNextPage: false,
  };

  const hasExtraRecords = edges.length > limit;

  // pageInfo may be extended, so set data gradually
  if (edges.length > 0 && limit > 0) {
    pageInfo.startCursor = edges[0].cursor;
    if (hasExtraRecords) {
      pageInfo.endCursor = edges[limit - 1].cursor;
    } else {
      pageInfo.endCursor = edges[edges.length - 1].cursor;
    }
    pageInfo.hasPreviousPage = skip > 0 || !!args.after;
    pageInfo.hasNextPage = hasExtraRecords || !!args.before;
  }

  return pageInfo;
}

export function prepareRawQuery(
  rp: Partial<ConnectionResolveParams<any>>,
  sortConfig: ConnectionSortOpts
) {
  if (!rp.rawQuery) {
    rp.rawQuery = {};
  }

  const beginCursorData = cursorToData(rp?.args?.after);
  if (beginCursorData) {
    const r = sortConfig.afterCursorQuery(rp.rawQuery, beginCursorData, rp);
    if (r !== undefined) {
      rp.rawQuery = r;
    }
  }

  const endCursorData = cursorToData(rp?.args?.before);
  if (endCursorData) {
    const r = sortConfig.beforeCursorQuery(rp.rawQuery, endCursorData, rp);
    if (r !== undefined) {
      rp.rawQuery = r;
    }
  }
}

export function prepareLimitSkipFallback(
  rp: ConnectionResolveParams<any>,
  limit: number,
  skip: number
): [number, number] {
  let newLimit = limit;
  let newSkip = skip;

  let beforeSkip: number = 0;
  let afterSkip: number = 0;

  if (rp?.args?.before) {
    const tmp = cursorToData(rp.args.before);
    if (Number.isInteger(tmp)) {
      beforeSkip = parseInt(tmp, 10);
    }
  }
  if (rp?.args?.after) {
    const tmp = cursorToData(rp.args.after);
    if (Number.isInteger(tmp)) {
      afterSkip = parseInt(tmp, 10) + 1;
    }
  }

  if (beforeSkip && afterSkip) {
    const rangeLimit = beforeSkip - afterSkip;
    if (rangeLimit < 0) {
      newLimit = 0;
      newSkip = skip + afterSkip;
    } else if (rangeLimit < limit) {
      newLimit = rangeLimit;
      newSkip = skip + beforeSkip - rangeLimit;
    } else {
      newSkip = skip + afterSkip;
    }
  } else if (beforeSkip) {
    // just simple backward listing (without after arg)
    // so we simple take previous records reducing skip by limit value
    newSkip = beforeSkip - limit;
    if (newSkip < 0) {
      newSkip = 0;
      newLimit = limit;
      // offset 0, so limit should not exceed offset in cursor,
      // otherwise it returns again this record
      if (newLimit > beforeSkip) {
        newLimit = beforeSkip;
      }
    }
  } else if (afterSkip) {
    newSkip = afterSkip;
  }

  return [newLimit, newSkip];
}

export function emptyConnection(): ConnectionType {
  return {
    count: 0,
    edges: [],
    pageInfo: {
      startCursor: '',
      endCursor: '',
      hasPreviousPage: false,
      hasNextPage: false,
    },
  };
}

export function findSortConfig(
  configs: ConnectionSortMapOpts,
  val: any
): ConnectionSortOpts | undefined {
  // Object.keys(configs).forEach(k => {  // return does not works in forEach as
  // I want
  for (const k in configs) {
    if (configs[k].value === val) {
      return configs[k];
    }
  }

  // Yep, I know that it's now good comparison, but fast solution for now
  // Sorry but complex sort value should has same key ordering
  //   cause {a: 1, b: 2} != {b: 2, a: 1}
  // BTW this code will be called only if arg.sort setted up by hands
  //   if graphql provides arg.sort, then first for-loop (above) done all work
  const valStringified = JSON.stringify(val);
  for (const k in configs) {
    if (JSON.stringify(configs[k].value) === valStringified) {
      return configs[k];
    }
  }

  return undefined;
}
