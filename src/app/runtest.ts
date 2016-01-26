

/// <reference path="../../typings/tsd.d.ts" />

import fs = require("fs");
import path = require("path");

var argv = { polyfills:[], verbose:false, display:false, _:[] };

function v(...msg:any[]) {
  if (argv.verbose) {
    console.log.apply(null, msg);
  }
}

function fail(code:number = -1, ...msg:string[]) {
  if (msg.length != 0) console.error.apply(null, msg);
  require("process").exit(code);
}

function showHelp() {
  console.log("runtest.js - a script to run a test set in distinct node process");
  console.log("  the JSON test report is written on output");
  console.log(" NOTE : this script is intended for internal escheck use")
  console.log();
  console.log("    node runtest.js <testFile>");
  console.log("      <testfile> : a test set generated by escheck");
  
  console.log("    -p, --polyfill <file> : a module to require before running the script");
  console.log("        Note : modules listed in a //polyfills: comment in the testfile");
  console.log("               will be automatically be loaded");
}

//var babel_polyfill = require('babel-polyfill');
v(process.argv);

// not using Yargs, because polyfills must be required first
(function () {
  var lastOption = undefined;
  process.argv.slice(2).forEach( function (arg) {
    if (arg.startsWith("-")) {
      var opt = arg.startsWith("--") ? arg.substr(2) : arg.substr(1,1) ;
      switch (opt) {
        case "v":
        case "verbose":
          argv.verbose = true;
          v("Switching to verbose mode");
          break;
        case "d":
        case "display":
          argv.display = true;
          v("Switching to verbose mode");
          break;
        default:
          break;
      }
      lastOption = opt;
    } else {
      switch (lastOption) {
        case "p":
        case "polyfill":
          argv.polyfills.push(arg);
          break;
        default:
          // all unknown options are considered as flags
          argv._.push(arg);
      }
      
      lastOption = undefined;
    }
  })
})();

v("Arguments ",argv._);

if (argv._.length === 0) { showHelp(); fail(1,"Missing <testfile> argument"); }
if (argv._.length > 1) { showHelp(); fail(1,"Extra <testfile> argument"); }

var testFile = path.resolve(argv._[0]);

if (!fs.existsSync(testFile)) { showHelp(); fail(2, "'", testFile, "' does not exist"); }

function fetchpolyfills(polyfills:string[], line, currentIndex, array):string[] {
  var list = /^\/\/ polyfills:(.*)/.exec(line);
  if (list) return polyfills.concat(list[1].split(",").filter(Boolean));
  else return polyfills;
}
var inlinePolyfills = fs.readFileSync(testFile, 'utf-8')
      .split("\n")
      .reduce( fetchpolyfills, []);
// now include the polyfills
var allPolyfills = inlinePolyfills.concat(argv.polyfills);
try {
  for (var i = 0; i < allPolyfills.length; ++i) {
    var p = allPolyfills[i];
    v("require('"+p+"')");
    require(p);
  }
} catch (e) {
  console.error("An error occured while loading polyfills ", e.msg);
  v(e.stack);
  require("process").exit(-1);
}

// now require the main script

v("require(",testFile,")")
var r = require("./runner");

r.runAllFromFileAsync(testFile, function (err, report) {
  if (err) fail(-1, err);
  if (argv.display) {
    var d = require("./report");
    console.log("Report");
    d.displayReport({indent:true}, report);
    console.log("-----");
  } else {
    console.log(JSON.stringify(report,null,2));
  }
})