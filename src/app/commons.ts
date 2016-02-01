
/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="./babel-core.d.ts" />
/// <reference path="./traceur.d.ts" />

import u = require('./utils');
import chalk = require("chalk");
import _ = require("lodash");

import babel = require('babel-core');
import traceur = require('traceur');


/** the error message for tests which cannot be run */
export var unableMsg = 'Unable to run this test';

export function strToFilter(str) {
  try {
    if (str == null || _.isArray(str) || str instanceof RegExp) return str;
    var res = str.toString()
              .split('/')
              .map( function (x) {
                 return (x != "" && x != "*") ? new RegExp(makeIdentifier(x)) : null; 
               });
    return res.length === 1 ? res[0] : res;
  } catch (e) {
    console.error(chalk.red("Invalid filter : "),str, " [",e,"]");
    process.exit(-1);
  }
}

export function isJsonFilePath(path/*:string*/) {
  return path.endsWith(".json");
}

/** transforms any string to a valid Javascript identifier
 */
export function makeIdentifier(str:string) {
  if (str == null) return str;
  var parts = str.split(/\W+/).filter(Boolean);
    // filter(Boolean) removes empty parts
  var initial = parts[0];
  if (/[0-9]/.test(initial.charAt(0))) initial = "_" + initial;
  var res = [ initial.toLowerCase() ];
  return [ u.lowerize(initial) ].concat(parts.slice(1).map(u.capitalize)).join("");
}

export interface Compiler {
  (src:string, options?:any):string;
  polyfillModules?:string[];
  polyfillsToInclude?:string[];
}

export function selectCompiler(name):Compiler {
  var compileFunc = undefined;
  var polyfillModules = [];
  var polyfillsToInclude = [];
  switch(name) {
    case "babel" : 
      compileFunc = function (src, options) { return babel.transform(src, {presets: ['es2015']} ).code; };
      polyfillModules = [ "babel-polyfill" ];
      break;
    case "traceur" : 
      compileFunc = function (src) { return traceur.compile(src); };
      polyfillsToInclude = [ "traceur/bin/traceur-runtime.js" ];
      break;
    case "es6-shim" : 
      compileFunc = String;
      polyfillModules = [ "es6-shim" ];
      break;
    default: return undefined;
  }
  var res:Compiler = function (src, options) {
                try { 
                  return compileFunc(src, options);
                } catch (e) {
                  return new Error("Unable to compile " + e.msg);
                }
  };
  res.polyfillModules = polyfillModules;
  res.polyfillsToInclude = polyfillsToInclude;
  return res;
}

/** returns true is the function body is asynchronous
 * (i.e. makes a call to asyncTestPassed() or asyncTestFailed())
 * 
 */
export function isAsyncTest(body:string):boolean {
  return /asyncTest(Passed|Failed)\(\)/.test(body);
}

export interface TestFunction {
  (globalObject:{}):any;
}

export interface AsyncTestFunction {
  (global:{},asyncTestPassed: (res:any) => void):any;
} 

export interface RuntimeEnv {
  node?: {
    os?: { type?:string; release?:string; },
    version?:string;
    arch?:string;
    platform?:string
    v8?:string;
  },
  navigator?: {
    appName?:string;
    appVersion?:string;
    platform?:string;
    product?:string;
    userAgent?:string;
  }
}

export interface TestReport {
  finished: boolean;
  env: RuntimeEnv;
  options: any;
  asyncPending:number;
  results:{};
}
