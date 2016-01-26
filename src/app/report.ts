/// <reference path="../../typings/tsd.d.ts" />

import chalk = require("chalk");
import _ = require("lodash");

import u = require("./utils");
import c = require("./commons");

interface Summary {
  __count:number;
  __success:number;
}

function isSuccess(testResult) {
  return !(typeof testResult === "object") && testResult == true;
}

/** true if an object key should be ignored in a test collection */
function shouldIgnore(key) {
  return typeof key !== "string" || key.startsWith("__");
}

/** computes the test summary statistics for a test report */
function summary(report):Summary {
  var res:Summary = { __count:0, __success:0};
  _.forIn(report, function (val, key) {
    if (shouldIgnore(key)) return;
    if (_.isObject(val) && !(val instanceof Error)) {
      // we have a set of subtests
      var s = summary(val);
      res.__count += s.__count;
      res.__success += s.__success;
    } else {
      // this is a final test
       res.__count++;
      if (isSuccess(val))  res.__success++;
    }
  });
  //report.__summary = res;
  return res;
}

function displayTest(options,result, path, tests) {
  if (options.summary) return;
  if (options.fail && result == true) return;
  var unableToRun = (result instanceof Error) && result.message == c.unableMsg;
  var strictOnly = (result === "strict");
  var color = strictOnly ? chalk.cyan : (unableToRun ? chalk.blue : (result == true ? chalk.green : chalk.red));
  var check = (result == true ? '\u2714' : '\u2718')
  console.log(color(check, "\t", u.ind(options.indent ? path.length : 0), u.last(path)));
  if (options.errors && (result instanceof Error)) {
    console.log("\t\t", u.clipString(70,result))
  }
  if (options.src && tests) {
    var test = _.get(tests, path);
    console.log("------------------------");
    console.log(u.indentCode(4, test.toString()));
    //console.log(highlight(test.toString(), {
    //  // optional options
    //  language: 'javascript', // will auto-detect if omitted
    //  theme: 'default' // a highlight.js theme
    // }));
    console.log("------------------------");
  }
}

function displayReportResults(options, testResults, path, tests) {
  //console.log(JSON.stringify(report,null," "));
  //console.log(report);
  _.forIn(testResults, function(test, name){ 
    // ignore private fields
    if (shouldIgnore(name)) return;
    var testPath = path.concat(name);
    if (typeof test !== "object" || test instanceof Error) {
      // it is an elmentary test
      if (!options.fails || test != true)
        displayTest(options, test, testPath, tests);
    } else {
      var sum = summary(test);
      var full = sum.__count === sum.__success;
      var none = 0 === sum.__success;
      var color = (full ? chalk.green : (none ? chalk.red : chalk.yellow));
      if (options.fail && full) return;
      console.log("\t", u.ind(options.indent ? path.length : 0), name,' ', color(sum.__success.toString(),"/",sum.__count.toString()));
      displayReportResults(options, test, testPath, tests);
    }
  }); 
};

export function displayReport(options, report) {
  // display excluded tests
  if (report.excluded && report.excluded.length !== 0) {
    console.log(report.excluded.length," tests have been excluded");
    if (options.verbose) {
      console.log("\tThe following tests have been excluded")
      _.each(report.excluded, function(testPath) {
        console.log("\t* ",testPath);
      });
    }
  }
  console.log(options);
  console.log(report);
  // display results
  displayReportResults(options, report.results, [], report.tests);
}