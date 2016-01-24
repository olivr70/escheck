
/// <reference path="../../typings/tsd.d.ts" />

"use strict";

import _ = require("lodash");


export function mergeKeys(objects:any[]) {
  var allKeys = _.flatten(_.map(objects, Object.keys));
  return _.uniq(allKeys);
}

export function mergeObjects(first:any|any[], ...more:any[]) {
  if (arguments.length > 1) return mergeObjects(Array.prototype.slice.call(arguments));
  if (_.isArray(first) && first.length != 0 && _.every(first, _.isPlainObject)) {
    var result = {};
    var keys = mergeKeys(first);
    keys.forEach( function(key) {
     result[key] = mergeObjects(_.pluck(first, key));
    })
  } else {
    return first;
  }
  return result;
}