/* @flow */

export function resolverName(name: ?string) {
  return name || 'connection';
}

export function typeName(name: ?string) {
  const lowercaseName = resolverName(name);
  return lowercaseName[0].toUpperCase() + lowercaseName.slice(1);
}
