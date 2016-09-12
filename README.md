# graphql-compose-connection

[![travis build](https://img.shields.io/travis/nodkz/graphql-compose-connection.svg)](https://travis-ci.org/nodkz/graphql-compose-connection)
[![codecov coverage](https://img.shields.io/codecov/c/github/nodkz/graphql-compose-connection.svg)](https://codecov.io/github/nodkz/graphql-compose-connection)
[![](https://img.shields.io/npm/v/graphql-compose-connection.svg)](https://www.npmjs.com/package/graphql-compose-connection)
[![npm](https://img.shields.io/npm/dt/graphql-compose-connection.svg)](https://www.npmjs.com/package/graphql-compose-connection)
[![Join the chat at https://gitter.im/graphql-compose/Lobby](https://badges.gitter.im/nodkz/graphql-compose.svg)](https://gitter.im/graphql-compose/Lobby)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

This is a plugin for [graphql-compose](https://github.com/nodkz/graphql-compose) family, which adds to the TypeComposer `connection` resolver.

Live demo: [https://graphql-compose.herokuapp.com/](https://graphql-compose.herokuapp.com/)

This package completely follows to Relay Cursor Connections Specification (https://facebook.github.io/relay/graphql/connections.htm).

Besides standard connection arguments `first`, `last`, `before` and `after`, also added significant arguments:
* `filter` arg - for filtering records
* `sort` arg - for sorting records. Build in mechanism allows sort by any unique indexes (not only by id). Also supported compound sorting (by several fields).

[CHANGELOG](https://github.com/nodkz/graphql-compose-connection/blob/master/CHANGELOG.md)

Installation
============
```
npm install graphql graphql-compose graphql-compose-connection --save
```

Modules `graphql` and `graphql-compose` are in `peerDependencies`, so should be installed explicitly in your app. They should not installed as submodules, cause internally checks the classes instances.


Example
=======
```js
import composeWithConnection from 'graphql-compose-connection';
import userTypeComposer from './user.js';
const OPERATORS_FIELDNAME = '_operators';

composeWithConnection(userTypeComposer, {
  findResolverName: 'findMany',
  countResolverName: 'count',
  sort: {
    _ID_DESC: {
      uniqueFields: ['_id'],
      sortValue: { _id: -1 },
      directionFilter: (filter, cursorData, isBefore) => {
        filter[OPERATORS_FIELDNAME] = filter[OPERATORS_FIELDNAME] || {};
        filter[OPERATORS_FIELDNAME]._id = filter[OPERATORS_FIELDNAME]._id || {};
        if (isBefore) {
          filter[OPERATORS_FIELDNAME]._id.gt = cursorData._id;
        } else {
          filter[OPERATORS_FIELDNAME]._id.lt = cursorData._id;
        }
        return filter;
      },
    },
    AGE_ID_ASC: {
      uniqueFields: ['age', '_id'],
      sortValue: { age: 1, _id: -1 },
      directionFilter: (filter, cursorData, isBefore) => {
        filter[OPERATORS_FIELDNAME] = filter[OPERATORS_FIELDNAME] || {};
        filter[OPERATORS_FIELDNAME]._id = filter[OPERATORS_FIELDNAME]._id || {};
        filter[OPERATORS_FIELDNAME].age = filter[OPERATORS_FIELDNAME].age || {};
        if (isBefore) {
          filter[OPERATORS_FIELDNAME].age.lt = cursorData.age;
          filter[OPERATORS_FIELDNAME]._id.gt = cursorData._id;
        } else {
          filter[OPERATORS_FIELDNAME].age.gt = cursorData.age;
          filter[OPERATORS_FIELDNAME]._id.lt = cursorData._id;
        }
        return filter;
      },
    }
  },
})
```
<img width="1249" alt="screen shot 2016-07-20 at 12 20 08" src="https://cloud.githubusercontent.com/assets/1946920/16976899/67a5e0f8-4e74-11e6-87e5-fc4574deaaab.png">

Requirements
============
Types should have following resolvers:
* `count` - for counting records
* `findMany` - for filtering records. Also required that this resolver supports search with operators (lt, gt), which used in `directionFilter` option. Resolver `findMany` should have `filter` argument, which will be copied to connection. Also should have `limit` and `skip` args.

Used in plugins
===============
[graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose) - converts mongoose models to graphql types


License
=======
[MIT](https://github.com/nodkz/graphql-compose-connection/blob/master/LICENSE.md)
