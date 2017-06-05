/* @flow */
/* eslint-disable no-param-reassign */

export default function deepmerge(target: Object, src: Object): Object | mixed[] {
  if (Array.isArray(src)) {
    let dst = [];
    target = target || [];
    dst = dst.concat(target);
    src.forEach((e, i) => {
      if (typeof dst[i] === 'undefined') {
        dst[i] = e;
      } else if (typeof e === 'object') {
        dst[i] = deepmerge(target[i], e);
      } else if (target.indexOf(e) === -1) {
        dst.push(e);
      }
    });
    return dst;
  }

  const dst = {};
  if (target && typeof target === 'object') {
    Object.keys(target).forEach(key => {
      dst[key] = target[key];
    });
  }
  Object.keys(src).forEach(key => {
    if (typeof src[key] !== 'object' || !src[key]) {
      dst[key] = src[key];
    } else if (!target[key]) {
      dst[key] = src[key];
    } else {
      dst[key] = deepmerge(target[key], src[key]);
    }
  });

  return dst;
}
