var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var UglifyJS = require('uglify-js');
var InjectionFinder = require('../../../lib/finders/InjectionFinder');

var SOURCE_PATH = path.join(
  __dirname, '..', '..', 'cases', 'lib', 'finders',
  'InjectionFinder', 'source.js'
);

lab.experiment('lib/finders/InjectionFinder', function () {
  lab.experiment('#find', function () {
    lab.test('should find all dependency injections in source', function (done) {
      fs.readFile(SOURCE_PATH, {
          encoding: 'utf8'
        },
        function (error, source) {
          if (error) {
            done(error);
            return;
          }

          eval(source);

          var ast = UglifyJS.parse(source);
          var finder = new InjectionFinder();
          var names = finder.find(ast);

          var expected = {
            $inj1: true,
            $inj2: true,
            $inj3: true,
            $inj4: true,
            $inj5: true,
            config1: true,
            config2: true,
            config3: true,
            config4: true,
            config5: true
          };

          assert.deepEqual(names.length, Object.keys(expected).length, 'Wrong DI names');
          names.forEach(function (name) {
            assert.strictEqual(name in expected, true);
          });
          done();
        });
    });
  });
});
