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
function CountDown(asyncCalls, cb, continueOnError) {
  this.pending = asyncCalls.length;
  this.cb = cb;
  this.error = null;
  this.timeouts = [];
  this.results = [];
  this.continueOnError = (continueOnError == true);
  // schedule all calls
  var me = this;
  asyncCalls.forEach(function(asyncCall, index) {
    this.timeouts[index] = setTimeout(function () {
      asyncCall(this.completionCb(index))
    }, 0);
  })
}
CountDown.prototype.completionCb = function (index) {
  var me = this;
  return function (result) { 
    if (me.error != null) return;
    // we have not failed yet
    me.results[index] = result;
    if (result instanceof Error && !me.continueOnError) {
      me.error = result;
      me.cancel();
      if (me.cb) me.cb(result);
    } else {
      me.timeouts[index] = null;
      me.pending--;
      if (me.pending === 0) {
        if (me.cb) me.cb(me.results);
      }
    }
  }
}
CountDown.prototype.cancel = function () {
  this.timeouts.forEach( function (t) { clearTimeout(t); });
  this.timeouts = [];
}
CountDown.prototype.failure = function(err) {
  this.failed = true;
  if (typeof this.cb === "function") this.cb(err);
}
CountDown.prototype.completed = function(result) {
  if (result instanceof Error) this.success(result); else this.failure(result);  
}

module.exports = CountDown;