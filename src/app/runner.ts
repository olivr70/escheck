/// <reference path="../../typings/tsd.d.ts" />


import c = require("./commons")

import _ = require("lodash");



var errAsyncTestNotCompleted = new Error("Asynchronous test has not completed");

// ------------------- Test support functions --------
// Defines the test runtime environment
// These functions are expected to exist in some tests
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
    ioReport.asyncPending--;
    _.set(ioReport.results, path, res || true);
  }
}
global.makeTestPassedCallback = makeTestPassedCallback;

/** returns true if running node */
function inNodeJs()/*:boolean*/ {
  try {
    return Object.prototype.toString.call(process) === '[object process]' 
  } catch(e) { return false; }
}

interface RuntimeEnv {
  node: {
    
  },
  navigator: {
    
  }
}

/** returns an object with information about the runtime environment 
 * @see https://nodejs.org/docs/  
*/
export function envInfo():RuntimeEnv {
  var res = <RuntimeEnv>{};
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
function shouldIgnore(key) {
  return typeof key !== "string" || key.startsWith("__");
}





function runTestAsync(testPath, test, ioReport) {
    if (typeof test === "function") {
      // it's a final test. Let's run it
      if (c.isAsyncTest(test)) {
        ioReport.asyncPending++;
        _.set(ioReport.results, testPath, errAsyncTestNotCompleted);
      }
      try {
        _.set(ioReport.results, testPath, test(global, makeTestPassedCallback(testPath, ioReport)));
      } catch (e) {
        _.set(ioReport.results, testPath, e);
      }
    } else {
      runGroupAsync(testPath, test, ioReport);
    }
}

function runGroupAsync(path, group, ioReport) {
  for (var p in group) {
    if (!shouldIgnore(p)) {
      runTestAsync(path.concat(p), group[p], ioReport);
    }
  }
}


/** runs all the test in async mode and calls back with a report */
function runAllAsync(tests, cb) {
  try {
    var report = {env:envInfo(), results: {}, asyncPending:0, tests:tests };
    
    runGroupAsync([], tests, report);
    
    // all tests have been run. We have to wait for completions
    var loopCount = 10;
    var checkFinish = function () {
      // launch next check if pending calls
      if (report.asyncPending > 0) {
        if (--loopCount) {
           console.log("Waiting for completion : ", loopCount, " ", report.asyncPending);
           setTimeout(checkFinish, 100);
           return;
        }
        else { cb(new Error("" + report.asyncPending + " asynchronous tests have not completed")); } 
      } else {
        cb(null, report);
      }
    }
    setTimeout(checkFinish, 100);
  } catch (e) {
    setTimeout(function() { cb(e, null),1});
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
    runAllAsync(tests, cb);
  } catch (e) {
    console.log("unable to load file " + file);
    console.log(e);
    console.log(e.stack);
    cb(e);
  }
}