
/// <reference path="../../typings/tsd.d.ts" />

import fs = require("fs");
import path = require("path");
import _ = require("lodash");

import u = require("./utils");
import c = require("./commons");
import chalk = require('chalk');


var arr = u.arr, unarr = u.unarr;

var UglifyJS = require('uglify-js');

var errAsyncTestNotCompleted = new Error("Asynchronous test has not completed");

//var dataInternal = require("compat-table/data-internal");
var dataES5 = require("../../node_modules/compat-table/data-es5");
var dataES6 = require("../../node_modules/compat-table/data-es6");
var dataES7 = require("../../node_modules/compat-table/data-es7");
var tests = {es5: dataES5.tests, es6 : dataES6.tests, es7: dataES7.tests };


/** a class which holds all information on a specific generation task
 */
class GenerationReport {
  included = [];
  excluded = [];
  minifyErrors = [];
  src:string = undefined;
  error:Error = undefined;
  
  addMinifyError(testPath, func, e) {
    this.minifyErrors.push( { test:testPath, error:e.message, src: formatErrorLine(func, e.line, e.col)} );
    logMinifyError(testPath, func, e);
  }
}


/** formats a source code line to display the error location */
function formatErrorLine(src, line, col) {
  var text = src.split("\n")[line - 1];
  return "" + chalk.blue(text.substring(0, col)) + chalk.cyan("<!")+chalk.bold.blue(text.substring(col))+chalk.cyan(">");
 }
 
function logMinifyError(testPath, src, err) {
    console.log("Failed to minify " + chalk.underline(testPath.join(" / ")));
    console.log(formatErrorLine(src, err.line, err.col));
    console.log("  ", err.message);
}

GenerationReport.prototype.addMinifyError = function addMinifyError(testPath, func, e) {
    this.minifyErrors.push( { test:testPath, error:e.message, src: formatErrorLine(func, e.line, e.col)} );
    logMinifyError(testPath, func, e);
};

type PathStep = string | RegExp;
type Path = PathStep[];

/** tests if regex can match a part of pathItem
 * Note : although step can be expressed as a string, it is
 * inefficient to do so because the RegExp will be parsed on each call
 * Always returns true if regex is null, undefined or "*" */
function matchStep(step:PathStep, pathItem) {
  if (step == null || step === "*") return true;
  const regex = (typeof step === "string" ? new RegExp(step) : step);
  return regex.test(pathItem || "");
}

/** returns true if testPath matches the pathFilter
 * If pathFilter is an array of RegExp, tries to match each path step to 
 *   the corresponding filter
 * Otherwise, tries to match each step to the RegExp and returns true if one of them matches
 */
function matchFilter(pathFilter:RegExp|Path, testPath:string[]):boolean {
  if (_.isArray(pathFilter)) {
    for (var i = 0; i < pathFilter.length; ++i) {
      if (!matchStep(pathFilter[i], testPath[i])) {
        return false;
      }
    }
    return true;
  } else {
    // a single RegExp : accept if any ot the steps satisfies the RegEx
    return _.any(testPath, pathFilter.test.bind(pathFilter));
  }
}

/** returns true if testPath matches at least one of the supplied filters
 */
function matchAny(filters:Path[], testPath) {
  if (filters != null) {
    for (var i =0; i < filters.length; ++i) {
      var curFilter = filters[i];
      if (matchFilter(filters[i], testPath)) {
        return true;
      }
    }
  }
  return false;
}

export interface Options {
  includes?:Path[];
  excludes?:Path[];
  verbose?:boolean;
  sync?:boolean;
  async?:boolean;
  compiler?:string;
  compilerFunction?:c.Compiler;
}

/** returns true if 
 * - options include the testPath
 * - AND options do not exclude the testPath
 * @param {object} options
 * @param {array} options.includes
 * @param {array} options.excludes
 */
function accept(options, testPath) {
  // console.log(chalk.cyan(testPath), options.includes, options.excludes);
  var isIncluded = options.includes == null || options.includes.length === 0 || matchAny(options.includes, testPath);
  var isExcluded = options.excludes != null && options.excludes.length !== 0 && matchAny(options.excludes, testPath);
  // var shouldExclude = (options.excludes != null && matchAny(options.excludes, testPath));
  var res = isIncluded
      && !isExcluded;
  if (options.verbose && !res) {
    console.log(isIncluded 
          ? chalk.yellow(testPath.join("/"), " excluded")
          : chalk.magenta(testPath.join("/"), " not included"));
  }
  // console.log(chalk.cyan(testPath)," : ",res, " {", isIncluded,',', isExcluded, '}');
  return res;
}


/** extracts the function body from its string representation, as returend by
 * toString()
 * @return {string|undefined} - if extraction fails, returns undefined
 */
function extractFunctionBody(func) {
  var commentedBody = /[^]*\/\*([^]*)\*\/\}$/.exec(func);
  if (commentedBody) {
    return commentedBody[1].trim();
  } else {
    var explicitBody = /^\s*(?:["']use strict["'];)?\s*function\s*([_\w]\w*)?\(([^\)]*)\)\s*\{([^]*)\}\s*$/.exec(func);
    if (explicitBody) {
      return explicitBody[3].trim();
    }
  }
  console.log("Unable to extract function body from : ");
  console.log(func);
  return undefined;
}

/** changed the test source code for our runtime environment */
function adaptToRuntime(body) {
  //body = body.replace(/global\.__createIterableObject/g,"__createIterableObject");
  return body;
}

function isAsyncTest(body) {
  return /asyncTest(Passed|Failed)\(\)/.test(body);
}

function wrapAsyncTest(body) {
  if (!isAsyncTest(body)) return body;
  var str = "var res={}";
  str += "var timer = setTimeout(function() { if (res.status == undefined) { res.status = false} }, 1000);"
  str += "var asyncTestPassed = function () { if (res.status == undefined) { clearTimeout(timer); res.status = true} });"
  str += "var asyncTestFailed = function (err) { if (res.status == undefined) { clearTimeout(timer); res.status = err || new Error('Asynchronous test failed')} });"
  str += "(function() { " + body + "})()";
  str += "return result;"
}

/** tries to minify the function body
 * @param {Array} testPath - test name
 * @param {string} src - the uncommented function body extracted from data files 
 * @param {Function?} onError - the error callback if minification fails 
 */
function tryMinifyBody(testPath, src, onError) {
  var prefix = "function x(){";
  var suffix = "}";
  var func = prefix+src+suffix;
  try {
    //console.log(func);
    var funcMin = UglifyJS.minify(func, {fromString: true});
    // console.log(typeof funcMin);
    
    var res = funcMin.code.substring(prefix.length,funcMin.code.length - suffix.length);
    
    // console.log(res);
    return res;
  } catch (e) {
    if (typeof onError === "function") onError(testPath, func, e);
    return src;
  }
}

/** generates a test property and its function ,
 * @param {object|null} options
 * @param {boolean} options.minify- if true, source is minified
 * @param {boolean} options.sync - if true, synchronous tests are generated
 * @param {boolean} options.async - if true, asynchronous tests are generated
 * @param {string} test - the test source code
 * @param {string[]} testPath - the path to this test in the source object
 * @param {object} ioReport -
 * @param {string} tab - the indentation for this
*/
function genTestString(options,test, testPath, ioReport, tab) {
  options = options || {};
  var body = extractFunctionBody(test.exec.toString());
  var keepIt = true;
  if (body) {
    // test for async before compiling, because linting compilers discard the original source code
    var isAsync = isAsyncTest(body); 
    keepIt = (isAsync && options.async) || (!isAsync && options.sync);
    if (options.compilerFunction) {
      // body may contain a return statement, which can only appear in a function definition
      body = options.compilerFunction("function z(){" + body + "} ") + "return z();";
    }
    body = adaptToRuntime(body);
  } else {
    body = 'return new Error("Unable to extract function body")';
  }   
  var res = "";
  if (keepIt) {
    var bodyMin = options.minify ? tryMinifyBody(testPath, body, ioReport.addMinifyError.bind(ioReport)) : body;
    //str += "// " + body.length + " chars, "+bodyMin.length+ " minified\n"
    //res += "\n" + tab +"\""+jsEscape(last(testPath))+"\":";
    res += "\n" + tab + c.makeIdentifier(u.last(testPath))+":";
    res += (isAsync ? "a" :"f") +"(\"";
    res += u.jsEscape(bodyMin);
    res += "\")";
    return res;
  }
}

/** generates the source code for a group of tests
 * @param {array} groupPath - the path to this group in the tree
 * @param {object} tests - the source test definitions (as provided by data-esX.js)
 * @param {object} options
 * @param {boolean} options.minify
 * @param {object} ioReport - the generation report, mutable
 * @param {string} tab - the tabulation for this group
 * */ 
function genTestGroup(groupPath, tests, options, ioReport, tab) {
  if (tests == null) return "";
  var str = "";
  var testCount = 0;  // number of accepted tests
  tests.forEach( function (test, testIdx) {
    var testTab = tab + "  ";
      if (test.subtests) {
        var subStr = "";
        var subCount = 0;
        test.subtests.forEach( function (sub, subIdx) {
          var testPath = groupPath.concat([test.name, sub.name]);
          if (accept(options, testPath)) {
            ioReport.included.push(testPath.join("/"));
            //str += "// " + body.length + " chars, "+bodyMin.length+ " minified\n"
            if (subCount != 0) subStr += ","
            subStr += genTestString(options,sub, testPath, ioReport, testTab + "  ");
            subCount++;
          } else {
            ioReport.excluded.push(testPath.join("/"));
          }
        }); // foreach
        if (subStr.length != 0) {
          // at least one subtest, we have to add this test
          if (testCount) str+= ","
          str += "\n" + testTab + "\""+ u.jsEscape(test.name)+"\": { // test+";
          //str += "\n" + testTab + makeIdentifier(test.name)+": { // test+";
          str += subStr;
          str += "\n"+ testTab + "}";
          testCount++;
        }
      } else {  // it'a single test
          var testPath = groupPath.concat([test.name]);
          if (accept(options, testPath)) {
            ioReport.included.push(testPath.join("/"));
            if (testCount) str+= ",";
            str += genTestString(options, test, testPath, ioReport, tab);
            testCount++;
          } else {
            ioReport.excluded.push(testPath.join("/"));
          }
      }
  }); // foreach
  if (str.length != 0) {
    str = "\n" + tab + c.makeIdentifier(u.last(groupPath)) + ": {\n" + str +"\n"+ tab + "}";
  }
  return str;
}

function genByCategory(groupPath, tests, options, ioReport, tab) {
  tab = tab || "";
  var categories = new Object();
  tests.forEach( function(test) { var c = test.category; if (c) categories[c] = c;});
  if (Object.keys(categories).length != 0) {
    var str = "";
    Object.keys(categories).forEach(function(category) {
      var categoryPath = groupPath.concat([category]);
      var categoryTests = tests.filter(function(item) { return item.category == category});
      var strGroup = genTestGroup(categoryPath, categoryTests, options, ioReport, tab + "  ");
      if (strGroup.length != 0) {
        if (str.length != 0) { str += "," }
        str += strGroup;
      }
    });
    if (str.length != 0) {
      str+= "// category " + groupPath + "\n";
      str = "\n" + tab + c.makeIdentifier(u.last(groupPath)) + ": { // group\n" + str;
      str +="\n" + tab + "}";
    }
    return str;
  } else {
    // no categories for this group
    return genTestGroup(groupPath, tests, options, ioReport, tab);
  }
}


/** Generates the source code string for some tests, based on the options
 * @param {object} options - a set of options
 * @param {array} options.includes - an array of path filters to include
 * @param {array} options.excludes - an array of path filters to exclude
 * @param {boolean} options.minify - if true, will try to minify the test code
 * @return {object} a result object, .src holds the souce code, .report the generation report
 */
function generateTestsSource(options:Options):GenerationReport {
  var report = new GenerationReport();
  options = options || {};
  var str = "";
  if (options.compilerFunction && options.compilerFunction.polyfills && options.compilerFunction.polyfills.length != 0) {
    str += "// polyfills:"+options.compilerFunction.polyfills.join(",") + "\n";
  }
  str += "// ES6 compatibility checks\n";
  str += "// -------------------------\n";
  str += "/* Generated with the following options\n";
  str += JSON.stringify(options);
  str += " */"
  str += "// -------------------------\n";
  str += "var unableMsg = '"+ c.unableMsg + "';\n";
  str += "function wrapStrict(f) { return function() { var v = f(); return v === true ? 'strict' : v; } }\n";
  str += "function f(b){try{return new Function('global',b)} catch(e){" 
    + "try { return wrapStrict(new Function('global','\"use strict\";'+b)); } catch (ee) { return function(){return ee;}}}}\n";
  // str += "function a(b){return function() { return new Error(unableMsg)}}\n"
  str += "function a(b){ try { return new Function('global', 'asyncTestPassed', b); } catch (e) { return e; } }\n";
  str += "module.exports = {";
  var groups = [
            genTestGroup(['es5'], tests.es5, options, report, "  "),
            genByCategory(['es6'], tests.es6, options, report, "  "),
            genByCategory(['es7'], tests.es7, options, report, "  ")];
  str += u.joinNotEmpty(groups, ",\n");
  str+="\n};\n";
  report.src = str;
  return report;
}

export function prepareOptions(ioOptions:Options) {
  // let's parse includes and excludes to simplify profile edition
  ioOptions.includes = unarr(arr(ioOptions.includes).map(c.strToFilter));
  ioOptions.excludes = unarr(arr(ioOptions.excludes).map(c.strToFilter));
  if (ioOptions.compiler) {
    ioOptions.compilerFunction = c.selectCompiler(ioOptions.compiler);
  }
  return ioOptions;
}

/** generates multiple test files, one for each profile path
 * Each test profile is loaded and command line options are merged with it
 * If the profile defines a file property, it is used. Otherwise, the output file
 * is deduced from the profile path.
 * @param {string []} profilePathes - an array of pathes to profile files
 * @param {object} cliOpt - the options set on the command line
 * @return {Promise} - a Promise to an array of file pathes which will be fulfilled 
 *   when all files have been generated
 */
export function writeMultiple(profilePathes:string[], cliOpt:Options) {
  var results = [];
  results = profilePathes.map( function (profilePath) {
    return u.readFileP(profilePath, 'utf8')
      .then( function (fileContent) { 
        return {path: fileContent.path, data: JSON.parse(fileContent.data)}; })

      .then( function (jsonFile) {
        var opts:Options = _.defaults({}, jsonFile.data, cliOpt);
        prepareOptions(opts);
        var target = jsonFile.data.file ? jsonFile.data.file : path.parse(jsonFile.path).name + ".js";
        var src = generateTestsSource(opts).src;
        return u.writeFileP(target, src);
      })
      .catch( function (e) {
        console.log("Unable to load profile '",profilePath,"'", " : ", e);
        throw e;
      });
  });
  return Promise.all(results);
}


function dumpGenerationResult(result) {
  console.log("test count: " + result.included.length + " ( excluded " + result.excluded.length + " tests)");
  console.log("  " + result.minifyErrors.length + " minification errors");
}

/** Generates a test file 
 * @param {string} filepath - the path of the generated test file
 * @param {object} options
 */
function generateTests(filename, options:Options):GenerationReport {
  var report;
  try {
    report = generateTestsSource(options);
    fs.writeFileSync(filename, report.src);
    return report;
  } catch (e) {
    console.error("Unable to generate '" + filename +"' (" + e +")");
    if (options.verbose) {
      console.log(e.stackTrace);
    }
    report = new GenerationReport();
    report.error = e;
    return report;
  }
}

export function writeChecksJs(options:Options, filename) {
  if (!filename) filename = "./compatCheck.js"; 
  var res = generateTests(filename, options);
  dumpGenerationResult(res);
  console.log("File ",filename," has been generated");
}