


var mo = require("../app/mergeobjects.js");

var _ = require("lodash");



console.log(_.invoke(['abc'], String.prototype.split, '' ));

// keys = mo.mergeKeys([]);

keys = mo.mergeKeys([ {a:1} ]);
keys = mo.mergeKeys([ {a:1}, {a:'A'} ]);
console.log(mo.mergeKeys([ {a:1}, {b:2} ]));

console.log(mo.mergeObjects([ {a:1}, {a:"A"}]));
console.log(mo.mergeObjects([ {a:1}, {b:"B"}]));
console.log(mo.mergeObjects([ {a:1, b:2}, {b:'B'}]));

console.log(mo.mergeObjects([ {a: { c: 11, d:12 }, b:2}, {a:{c:'C'}, b:'B'}]));

console.log(mo.mergeObjects([ {a: { c: 11, d:12 }, b:2}, {a:['C'], b:'B'}]));


