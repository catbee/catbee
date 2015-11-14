var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var events = require('events');
var ServiceLocator = require('catberry-locator');
var Logger = require('../../mocks/Logger');
var ComponentFinder = require('../../../lib/finders/ComponentFinder');

var CASE_PATH = path.join(
  'test', 'cases', 'lib', 'finders', 'ComponentFinder'
);

lab.experiment('lib/finders/ComponentFinder', function () {
  lab.experiment('#find', function () {
    lab.test('should find all valid components', function (done) {
      var locator = createLocator({
          componentsGlob: 'test/**/test-cat-component.json'
        }),
        finder = locator.resolve('componentFinder');

      var expectedPath = path.join(
        process.cwd(), CASE_PATH, 'expected.json'
        ),
        expected = require(expectedPath);

      finder
        .find()
        .then(function (found) {
          assert.strictEqual(
            Object.keys(found).length,
            Object.keys(expected).length,
            'Wrong store count'
          );

          Object.keys(expected)
            .forEach(function (name) {
              assert.strictEqual(
                (name in found), true,
                name + ' not found'
              );
              assert.strictEqual(
                found[name].name, expected[name].name
              );
              assert.strictEqual(
                found[name].path, expected[name].path
              );
              assert.deepEqual(
                found[name].properties,
                expected[name].properties
              );
            });
          done();
        })
        .catch(done);
    });
    lab.test('should find all valid components by globs array', function (done) {
      var caseRoot = 'test/cases/lib/finders/ComponentFinder/components',
        locator = createLocator({
          componentsGlob: [
            caseRoot + '/test1/**/test-cat-component.json',
            caseRoot + '/test1/test-cat-component.json',
            caseRoot + '/test3/**/test-cat-component.json',
            caseRoot + '/test3/test-cat-component.json'
          ]
        }),
        finder = locator.resolve('componentFinder');

      var expectedPath = path.join(
        process.cwd(), CASE_PATH, 'expected.json'
        ),
        expected = require(expectedPath);

      finder
        .find()
        .then(function (found) {
          assert.strictEqual(
            Object.keys(found).length,
            Object.keys(expected).length,
            'Wrong store count'
          );

          Object.keys(expected)
            .forEach(function (name) {
              assert.strictEqual(
                (name in found), true,
                name + ' not found'
              );
              assert.strictEqual(
                found[name].name, expected[name].name
              );
              assert.strictEqual(
                found[name].path, expected[name].path
              );
              assert.deepEqual(
                found[name].properties,
                expected[name].properties
              );
            });
          done();
        })
        .catch(done);
    });
  });
});

function createLocator(config) {
  var locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', config);
  locator.registerInstance('eventBus', new events.EventEmitter());
  locator.register('componentFinder', ComponentFinder, config);
  locator.register('logger', Logger, config);
  return locator;
}
