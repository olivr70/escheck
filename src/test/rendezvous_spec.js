"use strict";

const chai = require("chai")
const expect = chai.expect;
chai.should();


const rv = require("../app/rendezvous");


function async(x) {
  return function(cb) { setTimeout(function () { console.log("=>",x); cb(x); }, x) };
}

function asyncError(delay, msg) {
  return function(cb) { setTimeout(function () { console.log("!! ",msg); cb(new Error(msg)); }, delay) };
}


describe("module countdown : ", () => {
  describe("all", function() {
    it("should accept a single async", function (done) { 
      var funcs = [ async(1) ];
      rv.all(funcs, 0, function (res) {
        console.log("all async calls made : ", res);
        expect(res).to.eql([1]);
        done();
      } );
    });
    it("should timeout properly", function (done) { 
      var funcs = [ async(100) ];
      rv.all(funcs, 20, function (res) {
        console.log("all async calls made : ", res);
        expect(res).to.be.instanceof(Error);
        done();
      } );
    });
    it("should async", function (done) { 
      var funcs = [ asyncError(1, "expected error") ];
      rv.all(funcs, 0, function (res) {
        console.log("all async calls made : ", res);
        expect(res).to.be.instanceof(Error);
        done();
      } );
    });
    it("should accept a multiple async", function (done) { 
      var funcs = [ async(200), async(100), async(300) ];
      rv.all(funcs, 0, function (res) {
        console.log("all async calls made : ", res);
        expect(res).to.eql([200,100,300]);
        done();
      } );
    });
    it("should timeout properly in multiple async", function (done) { 
      var funcs = [ async(10),async(20),async(30) ];
      rv.all(funcs, 25, function (res) {
        console.log("all async calls made : ", res);
        expect(res).to.be.instanceof(Error);
        done();
      } );
    });
  });
  describe("#parallel", function () {
    
    it("#21 should execute all", function (done) { 
      var funcs = [ async(10),asyncError(15, "expected error"), async(30) ];
      rv.parallel(funcs, 200, function (res) {
        console.log("#21 all async calls made : ", res);
        expect(res[0]).to.equal(10);
        expect(res[1]).to.be.an.instanceof(Error);
        expect(res[2]).to.equal(30);
        done();
      } );
    });
    it("#22 should timeout properly in multiple async", function (done) { 
      var funcs = [ async(10),async(20),async(300) ];
      rv.parallel(funcs, 250, function (res) {
        console.log("#22 all async calls made : ", res);
        expect(res[0]).to.equal(10);
        expect(res[1]).to.equal(20);
        expect(res[2]).to.be.an.instanceof(Error);
        done();
      } );
    });
  })
  describe("#sequence", function () {
    
    it("#21 should execute all", function (done) { 
      var funcs = [ async(10),asyncError(15, "expected error"), async(30) ];
      rv.sequence(funcs, 200, function (res) {
        console.log("#21 all async calls made : ", res);
        expect(res[0]).to.equal(10);
        expect(res[1]).to.be.an.instanceof(Error);
        expect(res[2]).to.equal(30);
        done();
      } );
    });
    it("#22 should timeout properly in multiple async", function (done) { 
      var funcs = [ async(10),async(20),async(300) ];
      rv.sequence(funcs, 250, function (res) {
        console.log("#22 all async calls made : ", res);
        expect(res[0]).to.equal(10);
        expect(res[1]).to.equal(20);
        expect(res[2]).to.be.an.instanceof(Error);
        done();
      } );
    });
    it("#23 should timeout properly in multiple async", function (done) { 
      var funcs = [ async(100),async(200),async(300) ];
      rv.sequence(funcs, 250, function (res) {
        console.log("#23 all async calls made : ", res);
        expect(res[0]).to.equal(100);
        expect(res[1]).to.be.an.instanceof(Error);
        expect(res[2]).to.be.an.instanceof(Error);
        done();
      } );
    });
  })
});

