"use strict";

var chai = require("chai")
var expect = chai.expect;
chai.should();


var mo = require("../app/mergeobjects");


describe("module mergeobjects : ", function () {
  describe("#mergeObjects", function() {
    it("should return an empty array if no objects are provided", function () {
     expect(mo.mergeObjects([])).to.eql([]);
    });
    it("should return an empty object", function () {
     expect(mo.mergeObjects({})).to.eql({});
    });
    it("should merge a group of empty objects", function () {
     expect(mo.mergeObjects({},{},{})).to.eql({});
    });
    it("should preserve simple values", function () {
     expect(mo.mergeObjects(1)).to.eql(1);
     expect(mo.mergeObjects("a")).to.eql("a");
     expect(mo.mergeObjects(null)).to.eql(null);
     expect(mo.mergeObjects(undefined)).to.eql(undefined);
    });
    it("should preserve an array which holds at least one non POJO", function () {
     expect(mo.mergeObjects([1,{a:1}])).to.eql([1,{a:1}]);
    });
    it("should merge 2 simple object", function () {
     expect(mo.mergeObjects({a:1},{a:2})).to.eql({a:[1,2]});
    });
    it("should merge 4 simple object", function () {
     expect(mo.mergeObjects({a:1},{a:2},{a:3},{a:4})).to.eql({a:[1,2,3,4]});
    });
    it("should merge multiple properties", function () {
     expect(mo.mergeObjects({a:1,b:1},{a:2,b:2})).to.eql({a:[1,2],b:[1, 2]});
    });
    it("should merge and fill missing values with undefined", function () {
     expect(mo.mergeObjects({a:1},{b:2})).to.eql({a:[1,undefined],b:[undefined, 2]});
    });
    
    it("should merge deeply", function () {
     expect(mo.mergeObjects({a:{x:1}},{a:{x:2}})).to.eql({a:{x:[1,2]}});
    });
  });
});  