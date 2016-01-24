
/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="./babel-core.d.ts" />

import u = require('./utils');
import chalk = require("chalk");

import babel = require('babel-core');


/** the error message for tests which cannot be run */
export var unableMsg = 'Unable to run this test';

export function strToFilter(str) {
  try {
    if (str == null || _.isArray(str)) return str;
    var res = str.toString()
              .split('/')
              .map( function (x) {
                 return (x != "" && x != "*") ? new RegExp(makeIdentifier(x)) : null; 
               });
    return res.length === 1 ? res[0] : res;
  } catch (e) {
    console.error(chalk.red("Invalid filter : "),str);
    process.exit(-1);
  }
}

export function isJsonFilePath(path/*:string*/) {
  return path.endsWith(".json");
}

/** transforms any string to a valid Javascript identifier
 */
export function makeIdentifier(str) {
  var parts = str.split(/\W+/).filter(Boolean);
    // filter(Boolean) removes empty parts
  var initial = parts[0];
  if (/[0-9]/.test(initial.charAt(0))) initial = "_" + initial;
  var res = [ initial.toLowerCase() ];
  return [ u.lowerize(initial) ].concat(parts.slice(1).map(u.capitalize)).join("");
}

export function selectCompiler(name) {
  var compileFunc = undefined;
  switch(name) {
    case "babel" : 
      compileFunc = function (src) { return babel.transform(src, {presets: ['es2015']} ).code; };
      break;
    default: return undefined;
  }
  return function (src) {
    try { 
      return compileFunc(src);
    } catch (e) {
      return new Error("Unable to compile");
    }
  }
}

export function isAsyncTest(body:string) {
  return /asyncTest(Passed|Failed)\(\)/.test(body);
}
