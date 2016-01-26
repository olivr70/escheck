/// <reference path="../../typings/tsd.d.ts" />


import c = require("./commons")

import _ = require("lodash");



var errAsyncTestNotCompleted = new Error("Asynchronous test has not completed");

// ------------------- Test support functions --------
// Defines the test runtime environment
// These functions are expected to exist in some kangax tests
// -  __createIterableObject
// -  makeTestPassedCallback
if (typeof global === 'undefined') {
  var global = this;
}
function __createIterableObject(arr, methods) {
  methods = methods || {};
  if (typeof Symbol !== 'function' || !Symbol.iterator) {
    return {};
  }
  arr.length++;
  var iterator = {
    next: function() {
      return { value: arr.shift(), done: arr.length <= 0 };
    },
    'return': methods['return'],
    'throw': methods['throw']
  };
  var iterable = {};
  iterable[Symbol.iterator] = function(){ return iterator; }
  return iterable;
}
global.__createIterableObject = __createIterableObject;


function makeTestPassedCallback(path, ioReport) {
  return function (res) {
    if (!ioReport.finished) {
      // this covers the case where the callback is invoked
      // after we timed out and sent the reports
      ioReport.asyncPending--;
      _.set(ioReport.results, path, res || true); 
    }
  }
}
global.makeTestPassedCallback = makeTestPassedCallback;

/** returns true if running node */
function inNodeJs()/*:boolean*/ {
  try {
    return Object.prototype.toString.call(process) === '[object process]' 
  } catch(e) { return false; }
}


/** returns an object with information about the runtime environment 
 * @see https://nodejs.org/docs/  
*/
export function envInfo():c.RuntimeEnv {
  var res = <c.RuntimeEnv>{};
  if (inNodeJs()) {
    var os = require("os");
    var process = require("process");
    res.node = {
      os: { type: os.type() // in v0.4.4
            , release: os.release() // in v0.4.4
       }
      , version: process.version
      , arch: process.arch
      , platform: process.platform
      , v8 : process.versions.v8
      }
  }
  if (typeof navigator !== "undefined") {
    res.navigator = {
      appName: navigator.appName
      , appVersion : navigator.appVersion
      , platform : navigator.platform
      , product : navigator.product
      , userAgent : navigator.userAgent
    }
  }
  return res;
}

/** true if an object key should be ignored in a test collection */
function shouldIgnore(key:any) {
  return typeof key !== "string" || key.startsWith("__");
}


/** runs a test asynchrounously 
 * @param {string[]} testPath - path of this test
 * @param {Function|Object} test - the test itself (a function) or a group of tests
 * @param {}
 */
function runTestAsync(testPath:string[], test:c.AsyncTestFunction|Object, ioReport:c.TestReport) {
    if (typeof test === "function") {
      // it's a final test. Let's run it
      if (c.isAsyncTest(test.toString())) {
        ioReport.asyncPending++;
        _.set(ioReport.results, testPath, errAsyncTestNotCompleted);
      }
      try {
        _.set(ioReport.results, testPath, (<c.AsyncTestFunction>test)(global, makeTestPassedCallback(testPath, ioReport)));
      } catch (e) {
        _.set(ioReport.results, testPath, e);
      }
    } else {
      runGroupAsync(testPath, test, ioReport);
    }
}

function runGroupAsync(path:string[], group:{}, ioReport:c.TestReport) {
  for (var p in group) {
    if (!shouldIgnore(p)) {
      runTestAsync(path.concat(p), group[p], ioReport);
    }
  }
}


/** runs all the tests in async mode and calls back with a report
 * @param {Object[]} tests - multiple test groups to run
 * @param {Function} cb - the node style callback to call when all tests have finished
*/
function runAllAsync(tests:{}[], cb) {
  try {
    // create all empty reports
    var reports = tests.map( function (t) {
      return {env:envInfo(), results: {}, asyncPending:0, tests:t, finished:false };
    } );
    // lauch all tests
    tests.forEach(function(t, index) { runGroupAsync([], t, reports[index]); });
    
    // all tests have been started. We have to wait for completions
    var loopCount = 10;
    var checkFinish = function () {
      // launch next check if pending calls
      var pending = reports.reduce(function(pending, r) { return pending + r.asyncPending }, 0);
      if (pending > 0) {
        if (--loopCount) {
           console.log("Waiting for completion : ", loopCount, " ", pending);
           setTimeout(checkFinish, 100);
           return;
        }
        else { // we will not wait any longer
          reports.forEach(function(r) { r.finished = true; })
          cb(null, reports);
          return;
        } 
      } else {
        cb(null, reports);
      }
    }
    setTimeout(checkFinish, 100);
  } catch (e) {
    // report error
    setTimeout(function() { cb(e, null),1});
  }
}

export function runMultipleFilesAsync(files:string[], cb) {
  try {
    var tests = files.map(function(f){ 
      console.log("Will load test file ",f);
      return require(f);
    });
    console.log("All test files loaded. Will start...")
    runAllAsync(tests, cb);
  } catch (e) {
    console.log("unable to load one of the following files " + files.join(","));
    console.log(e);
    console.log(e.stack);
    cb(e);
  }
}

/** loads, runs the tests and generates a report of all tests in a file 
 * 
 * Returns an object with :
 * - results : a tree of objects holding the results of individual tests
 * - env : information about the runtime environment
 * - tests: the tests which were provided
*/
export function runAllFromFileAsync(file, cb) {
  try {
    var tests = require(file);
    runAllAsync([tests], function (err, reports) {
      if (err) cb(err); else cb(null, reports[0]);
    });
  } catch (e) {
    console.log("unable to load file " + file);
    console.log(e);
    console.log(e.stack);
    cb(e);
  }
}