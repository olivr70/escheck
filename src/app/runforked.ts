
/// <reference path="../../typings/tsd.d.ts" />

import cp = require("child_process");
import path = require("path");
import c = require("./commons");

/** runs the script with the current version of node */
export function run(testFile:string, options:any, cb:(err:Error, report?:c.TestReport) => void) : cp.ChildProcess {
  var runScript = path.resolve(__dirname, "runtest.js");
  var args = [ testFile ];
  var cbDone = false;
  var testProcess = cp.fork(runScript, args );
  testProcess.on("message", function onMessage (report:c.TestReport) {
    console.log("Received test report");
    console.log(report);
    cb(null, report);
    cbDone = true;
  });
  testProcess.on("exit", function onExit (code) {
    if (!cbDone) {
      cbDone = true;
      cb(new Error("Child process exited without sending message"));
    }
    
  });
  return testProcess;
}