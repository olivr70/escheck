

/// <reference path="../../typings/tsd.d.ts" />

"use strict";

interface Callback {
  (val:Error|any):void;
}

interface AsyncFunc {
  (cb:Callback):void;
}

export function make(asyncCalls:AsyncFunc[], cb:Callback) {
  return new Countdown(asyncCalls, cb);
}

/** makes all async calls in parallel, and invokes the callback with 
 * an array of all results (in the same order as the callbacks)
 * As soon as one of the async calls fails, the callback is invoked
 * with the first error. As other async calls complete, their results are
 * ignored
 */
export function all(asyncCalls:AsyncFunc[], timeoutInMs:number, cb:Callback) {
  return make(asyncCalls, cb).timeout(timeoutInMs).run();
}

/** makes all async calls in parallel, and invoked the callback with an
 * array of all results
 */
export function parallel(asyncCalls:AsyncFunc[], timeoutInMs:number, cb:Callback) {
  return make(asyncCalls, cb).continueOnError(true).timeout(timeoutInMs).run();
}

/** makes all async calls in sequence, and invoked the callback with an
 * array of all results
 */
export function sequence(asyncCalls:AsyncFunc[], timeoutInMs:number, cb:Callback) {
  return make(asyncCalls, cb).workers(1).continueOnError(true).timeout(timeoutInMs).run();
}

/** an object which call a sinlge callback
 * with either
 * - the result of a group of async call
 * - the first error returned. If an error is retu
 * @param {array} asyncCalls - a set of single argument functions taking a c
 * @param {function} cb - the final callback to call
 * @param {boolean} [continueOnError=false] - if false, all pending calls are canceled
 *   and the result of those which have not completed will be ignored. Only the first Error
 *   is immediately returned
 */
export class Countdown {
  // config
  _continueOnError: boolean;
  _workerCount: number;
  _timeoutInMs: number;
  // state
  _nextToRun: number;
  _pending: number;
  _timeoutId: number;
  _timeouts: number [];
  // result
  _results: any [];
  _error:Error = null;
  
  constructor(private asyncCalls:AsyncFunc[], private cb:Callback) {
    this._nextToRun = 0;
    this._workerCount = asyncCalls.length;
    this._pending = asyncCalls.length;
    this._error = null;
    this._timeouts = [];
    this._results = [];
    this._continueOnError = false;
  }
  
  timeout(delayInMs:number) {
    this._timeoutInMs = delayInMs;
    return this;  // chain
  }
  
  workers(count:number) {
    this._workerCount = Math.min(count, this.asyncCalls.length);
    return this;
  }
  
  continueOnError(yesNo?:boolean) {
    this._continueOnError = (yesNo == true);
    return this;
  } 
  
  runNext() { 
    if (this._nextToRun >= this.asyncCalls.length) {
      console.log("!! Tried to run an extra task");
      return false;
    }
    var me = this;
    var index = this._nextToRun++;
    var asyncCall = this.asyncCalls[index];
    console.log("#", index, "scheduled - ", asyncCall );
    me._timeouts[index] = setTimeout(function () {
      asyncCall(me.completionCb(index))
    }, 0);
    return true;
  }
  
  run() {
    console.log("run");
    // schedule all calls
    var me = this;
    for (var i = 0; i <this._workerCount; ++i) { this.runNext(); }
    // this.asyncCalls.forEach(function(asyncCall, index) {
    //   console.log("scheduled #", index, " ", asyncCall);
    //   me.timeouts[index] = setTimeout(function () {
    //     asyncCall(me.completionCb(index))
    //   }, 0);
    // })
    // schedule timeout
    if (this._timeoutInMs > 0) {
      console.log("will timeout in ", this._timeoutInMs, "ms");
      this._timeoutId = setTimeout( function() { console.log("timed out"); me.onTimeout() }, this._timeoutInMs);
    } else {
      console.log("will not timeout");
    }
  }
  
  cancel() {
    clearTimeout(this._timeoutId);
    this._timeouts.forEach( function (t) { clearTimeout(t); });
    this._timeouts = [];
    this._nextToRun = this.asyncCalls.length;
  }
  failure(err) {
    this._error = err;
    if (typeof this.cb === "function") this.cb(err);
  }
  completed = function(result) {
    if (result instanceof Error) this.success(result); else this.failure(result);  
  }
  
  /** callback invoked when the timeout delay elapses */
  onTimeout() {
    this._error = new Error("Timeout delay has elapsed");
    this.fill(this._error);
    this.cancel();
    if (this._continueOnError)
    { this.cb(this._results); }
    else { this.failure(this._error); }
  }
  
  fill(val:any) {
    for (var i = 0; i < this.asyncCalls.length; ++i) {
      if (this._results[i] === undefined) this._results[i] = val;
    }
  }
  
  completionCb(index) {
    var me = this;
    return function (result) {
      console.log("#",index, " - Completed");
      if (me._error != null) return;
      // we have not failed yet
      me._results[index] = result;
      if (result instanceof Error && !me._continueOnError) {
        console.log("#",index, " - failed on first error ", result);
        me._error = result;
        me.cancel();
        if (me.cb) me.cb(result);
      } else {
        me._timeouts[index] = null;
        me._pending--;
        if (me._pending === 0) {
          me.cancel();  // for an enventual pending timeout
          console.log("#",index, " - Last callback ", me.cb)
          if (me.cb) me.cb(me._results);
        }
        console.log("#",index, " - Still pending ", me._pending);
        me.runNext();
      }
    } 
  }
}