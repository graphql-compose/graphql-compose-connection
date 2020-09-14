# graphql-compose-connection

[![travis build](https://img.shields.io/travis/graphql-compose/graphql-compose-connection.svg)](https://travis-ci.org/graphql-compose/graphql-compose-connection)
[![codecov coverage](https://img.shields.io/codecov/c/github/graphql-compose/graphql-compose-connection.svg)](https://codecov.io/github/graphql-compose/graphql-compose-connection)
[![version](https://img.shields.io/npm/v/graphql-compose-connection.svg)](https://www.npmjs.com/package/graphql-compose-connection)
[![downloads](https://img.shields.io/npm/dt/graphql-compose-connection.svg)](http://www.npmtrends.com/graphql-compose-connection)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

This is a plugin for [graphql-compose](https://github.com/graphql-compose/graphql-compose) family, which adds to the ObjectTypeComposer `connection` resolver.

Live demo: [https://graphql-compose.herokuapp.com/](https://graphql-compose.herokuapp.com/)

This package completely follows to Relay Cursor Connections Specification (<https://relay.dev/graphql/connections.htm>).

Besides standard connection arguments `first`, `last`, `before` and `after`, also added significant arguments:

- `filter` arg - for filtering records
- `sort` arg - for sorting records. Build in mechanism allows sort by any unique indexes (not only by id). Also supported compound sorting (by several fields).

[CHANGELOG](https://github.com/graphql-compose/graphql-compose-connection/blob/master/CHANGELOG.md)

## Installation

```bash
npm install graphql graphql-compose graphql-compose-connection --save
```

Modules `graphql` and `graphql-compose` are in `peerDependencies`, so should be installed explicitly in your app. They should not installed as submodules, cause internally checks the classes instances.

## Example

Implementation details of `findManyResolver` and `countResolver` can be found in [this file](./src/__mocks__/User.ts).

```js
import { prepareConnectionResolver } from 'graphql-compose-connection';
import { UserTC, findManyResolver, countResolver } from './user';

prepareConnectionResolver(userTC, {
  findManyResolver,
  countResolver,
  sort: {
    // Sorting key, visible for users in GraphQL Schema
    _ID_ASC: {
      // Sorting value for ORM/Driver
      value: { _id: 1 },

      // Field names in record, which data will be packed in `cursor`
      //   edges {
      //     cursor   <- base64(cursorData), for this example `cursorData` = { _id: 334ae453 }
      //     node     <- record from DB
      //   }
      // By this fields MUST be created UNIQUE index in database!
      cursorFields: ['_id'],

      // If for connection query provided `before` argument with above `cursor`.
      // We should construct (`rawQuery`) which will be point to dataset before cursor.
      // Unpacked data from `cursor` will be available in (`cursorData`) argument.
      // PS. All other filter options provided via GraphQL query will be added automatically.
      // ----- [record] -----   sorted dataset, according to above option with `value` name
      // ^^^^^                 `rawQuery` should filter this set
      beforeCursorQuery: (rawQuery, cursorData, resolveParams) => {
        if (!rawQuery._id) rawQuery._id = {};
        rawQuery._id.$lt = cursorData._id;
      },

      // Constructing `rawQuery` for connection `after` argument.
      // ----- [record] -----   sorted dataset
      //                ^^^^^  `rawQuery` should filter this set
      afterCursorQuery: (rawQuery, cursorData, resolveParams) => {
        if (!rawQuery._id) rawQuery._id = {};
        rawQuery._id.$gt = cursorData._id;
      },
    },

    _ID_DESC: {
      value: { _id: -1 },
      cursorFields: ['_id'],
      beforeCursorQuery: (rawQuery, cursorData, resolveParams) => {
        if (!rawQuery._id) rawQuery._id = {};
        rawQuery._id.$gt = cursorData._id;
      },
      afterCursorQuery: (rawQuery, cursorData, resolveParams) => {
        if (!rawQuery._id) rawQuery._id = {};
        rawQuery._id.$lt = cursorData._id;
      },
    },

    // More complex sorting parameter with 2 fields
    AGE_ID_ASC: {
      value: { age: 1, _id: -1 },
      // By these fields MUST be created COMPOUND UNIQUE index in database!
      cursorFields: ['age', '_id'],
      beforeCursorQuery: (rawQuery, cursorData, resolveParams) => {
        if (!rawQuery.age) rawQuery.age = {};
        if (!rawQuery._id) rawQuery._id = {};
        rawQuery.age.$lt = cursorData.age;
        rawQuery._id.$gt = cursorData._id;
      },
      afterCursorQuery: (rawQuery, cursorData, resolveParams) => {
        if (!rawQuery.age) rawQuery.age = {};
        if (!rawQuery._id) rawQuery._id = {};
        rawQuery.age.$gt = cursorData.age;
        rawQuery._id.$lt = cursorData._id;
      },
    }
  },
});
```

<img width="1249" alt="screen shot 2016-07-20 at 12 20 08" src="https://cloud.githubusercontent.com/assets/1946920/16976899/67a5e0f8-4e74-11e6-87e5-fc4574deaaab.png">

## Used in plugins

[graphql-compose-mongoose](https://github.com/graphql-compose/graphql-compose-mongoose) - converts mongoose models to graphql types

## License

[MIT](https://github.com/graphql-compose/graphql-compose-connection/blob/master/LICENSE.md)
