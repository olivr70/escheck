
/// <reference path="../../typings/tsd.d.ts" />


import fs = require('fs');
import _ = require("lodash");

// ------------------- Utilities --------------------
/** makes it argument an array :
 * - identiry if x is already an array
 * - an empty array if x is null or undefined
 * - a single item array with x in other cases
 */
export function arr(x:any) { return x != null ? (_.isArray(x) ? x : [ x ]) : [] }
/** unwraps an array
 * - returns null if array is an empty empty
 * - returns x otherwise
 */
export function unarr(x:any) { return x.length === 0 ? null : x }

var indents = ["", " ", "  ", "   ", "    ", "     ", "      "];

/** the error message for tests which cannot be run */
var unableMsg = 'Unable to run this test';

/** returns last item of an array */
export function last(arr:any[]):any {
  return arr ? arr[arr.length - 1] : undefined;
}

/** returns an indenting string of count spaces */
export function ind(count:number):string {
  return count < indents.length ? indents[count] : indents[indents.length - 1];
}

export function indentCode(depth:number, src:string) {
  return src.split("\n").join("\n" + ind(depth));
}

export function clipString(len:number, str:string):string {
  if (str == undefined) return str;
  str = str.toString();
  return str.length < len ? str : str.substring(0, len - 3) + "...";
}


export function capitalize(s/*:string*/) {
  if (s== undefined) return s;
  return s.charAt(0).toUpperCase() + s.substring(1);
}
export function lowerize(s/*:string*/) {
  if (s== undefined) return s;
  return s.charAt(0).toLowerCase() + s.substring(1);
}


export function err(msg:string) { return {ok:false,error:msg}; }


/** a join function which ignores empty elements */
export function joinNotEmpty(items:string[], sep:string) {
  var str ="";
  for (var i= 0; i < items.length; ++i) {
    var item = items[i];
    if (item != null && item != "") {
      if (str.length != 0) str+=sep;
      str+=item;
    }
  }
  return str;
}

// from @megawac here http://stackoverflow.com/questions/25333918/js-deep-map-function
export function deepMap(obj:_.Dictionary<any>, iterator, context) {
    return _.transform(obj, function(result, val, key) {
        result[key] = _.isObject(val) /*&& !_.isDate(val)*/ ?
                            deepMap(val, iterator, context) :
                            iterator.call(context, val, key, obj);
    });
}

interface Func1<R,T> {
  (x:T):R;
}

/** returns a callback function which 
 * - call its err argument if result is an Error
 * - calls its success argument otherwise
 * @param {Function} err - a single argument function
 * @param {Function} success - single argument function
 * @return {Function} a single argument function
 */
export function callback(err:Func1<any,any>, success:Func1<any,any>): Func1<any,any> {
  return function(result) { return result instanceof Error ? err(result) : success(result); }
}


// ------------------- Javascript source code functions --------
/** Escapes a Javascript string
 * */
export function jsEscape(str) {
  return JSON.stringify(str + '').slice(1,-1);
}

// ------------------- File functions --------

interface FileContent {
  path:string;
  data:string;
}

/** returns a Promise for the content of a file
 * @param {string} path - the loaded path
 * @return {Promise} a Promise of the file content as an object with
 *    path and data properties
 */
export function readFileP(path, options):Promise<FileContent> {
  console.log(typeof Promise);
  console.log(Promise);
  var p = new Promise( function (resolve, reject) {
    fs.readFile(path, options, function (err, data) {
      if (err) return reject(err);
      else resolve( {path:path, data: data} );
    })
  });
  return p;
}

/** returns a Promise for the path of written file
 * @param {string} path - the loaded path
 * @param {string} data - the file content
 * @return {Promise} a Promise of the file path
 */
export function writeFileP(path:string, data:string, options?):Promise<string> {
  return new Promise( function (resolve, reject) {
    fs.writeFile(path, data, options, function (err) {
      if (err) return reject(err);
      else resolve( path );
    })
  })
}
