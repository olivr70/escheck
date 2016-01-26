

/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="../../typings/yargs/yargs.d.ts" />



//var babel_polyfill = require('babel-polyfill');

import yargs = require("yargs");
import _ = require("lodash");
import path = require("path");

import u = require("./utils");
import c = require("./commons");
import g = require("./generator");
import r = require("./runner");
import d = require("./report");


var argv = yargs
    .version(require('../../package').version)
    .help("help")
    .alias("help","h")
    .default({ generate:true, run:true, summary: false, fail: false
        , errors:false, indent:false, verbose:false, src: false, sync:true, async:true })
    .boolean(["generate","run","summary","fail","errors", "indent", "verbose", "code"])
    .describe("generate", "if true, will generate the test file. Use --no-generate to use run an existing file")
      .alias("generate","g")
    .describe("run", "if true, will run the test file and display the results to the console. Use --no-run for generation only")
      .alias("run","r")
    .describe("summary", "if true, only summary lines for multiple tests are displayed")
      .alias("summary","s")
    .alias("fail","l")
    .describe("errors", "if true, shows only tests which fail")
      .alias("errors","e")
    .describe("verbose", "display detailed information")
      .alias("verbose","v")
    .describe("src", "display source code of tests")
      .boolean("src")
    .describe("sync", "run synchronous tests")
      .boolean("sync")
    .describe("async", "run asynchronous tests")
      .boolean("async")
    .describe("file", "target file")
      .alias("file", "f")
      .default("file", "./out/escheck.js") 
    .describe("minify", "if set, will try to minify tests")
      .boolean("minify")
      .default("minify", false)
    .describe("exclude", "test path pattern to exclude, as a RegExp, ")
      .alias("exclude", "x")
    .describe("compiler", "if set, each test source will be compiled separetely before generation")
      //.choices("compiler", ["babel"])
    .argv;
    
    
function prepareOptions(ioOptions) {
  // let's parse includes and excludes to simplify profile edition
  ioOptions.includes = u.unarr(u.arr(ioOptions.includes).map(c.strToFilter));
  ioOptions.excludes = u.unarr(u.arr(ioOptions.excludes).map(c.strToFilter));
  if (ioOptions.compiler) {
    ioOptions.compilerFunction = c.selectCompiler(ioOptions.compiler);
  }
  return ioOptions;
}


function computeAndReportAsync(options, file) {
  console.log("-------------------------");
  console.log("Running tests from file '",file,"'");
  console.log();
  r.runAllFromFileAsync(file, function (err, report) {
    if (err) {
      console.error("An error occured while asychronoulsy running the tests : ", err);
    } else {
      d.displayReport(options, report);
    }
  })
}

function go(options,file) { 
  //loadAndRunAll(file);
  computeAndReportAsync(options,file);
}
    
function writeAndGo(options, file) {
  prepareOptions(options);
  var absPath = path.resolve(file);
  if (options.generate) g.writeChecksJs(options, absPath);
  if (options.run) go(options, absPath);
}
    
var profileFiles = u.unarr(u.arr(argv._).filter(c.isJsonFilePath));
var otherArgs = u.unarr(u.arr(argv._).filter(_.negate(c.isJsonFilePath)));
argv.includes = u.unarr(u.arr(otherArgs).map(c.strToFilter));
argv.excludes = u.unarr(u.arr(argv.x).map(c.strToFilter));
if (argv.verbose) {
  console.log("Will include following filters:\n", argv.includes);
  console.log("Will exclude following filters:\n", argv.excludes);
}

if (argv.verbose) {
  console.log("profiles=",profileFiles);
  console.log("includes=",argv.includes);
  console.log("excludes=",argv.excludes);
}
// writeAndGo({include:[testGroups.es5]}, "./out/compatES5.js");

//writeAndGo({include:[testGroups.es6], noMinify:true}, "./out/compatES6.js");

//writeAndGo({include:[testGroups.es7]}, "./out/compatES7.js");

if (profileFiles) {	
  // we have a set of profile files
  g.writeMultiple(profileFiles, argv)
    .then( function (pathes) {
      console.log("The following test files have been generated");
      _.forEach(pathes, function (item) {
        console.log("- ", item);
      });
      return new Promise( function (resolve, reject) {
        console.log("Will run multiple files ", pathes.join(","))
        r.runMultipleFilesAsync(pathes, function (err, reports) {
          if (err) reject(err);
          else resolve(reports);
        })
      })
    })
    .then( function (reports:{}[]) {
      reports.forEach( function (r) {
        d.displayReport(argv,r);
      })
    })
    .catch( function (e) {
      console.log("Generation of multiple tests files has failed");
      console.log(e);
      console.log(e.stackTrace);
    });
} else {
  writeAndGo(argv, argv.file);
}
