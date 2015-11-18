var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var events = require('events');
var ServiceLocator = require('catberry-locator');
var ComponentLoader = require('../../../lib/loaders/ComponentLoader');
var ContextFactory = require('../../../lib/ContextFactory');
var ModuleApiProvider = require('../../../lib/providers/ModuleApiProvider');
var CookieWrapper = require('../../../lib/CookieWrapper');
var ComponentFinder = require('../../mocks/finders/ComponentFinder');
var Logger = require('../../mocks/Logger');

lab.experiment('lib/loaders/ComponentLoader', function () {
  lab.test('should properly load components', function (done) {
    var components = {
        'first-cool': {
          name: 'first-cool',
          path: 'test/cases/lib/loaders/ComponentLoader' +
          '/first/first.json',
          properties: {
            logic: './logic.js',
            errorTemplate: './templates/error.html',
            template: './templates/template.html'
          }
        },
        second: {
          name: 'second',
          path: 'test/cases/lib/loaders/ComponentLoader' +
          '/Second/second.json',
          properties: {
            logic: './index.js',
            template: './template.html'
          }
        }
      },
      locator = createLocator({
        isRelease: true
      }, components),
      loader = locator.resolve('componentLoader');

    loader
      .load()
      .then(function (loadedComponents) {
        assert.strictEqual(
          loadedComponents, loader.getComponentsByNames()
        );
        var componentNames = Object.keys(loadedComponents);
        assert.strictEqual(componentNames.length, 2);

        var component1 = loadedComponents[componentNames[0]],
          component2 = loadedComponents[componentNames[1]];
        assert.strictEqual(
          component1.name, components['first-cool'].name
        );
        assert.strictEqual(typeof (component1.constructor), 'function');

        assert.strictEqual(component2.name, components.second.name);
        assert.strictEqual(typeof (component2.constructor), 'function');
        assert.strictEqual(component2.errorTemplate, undefined);

        var expected = [
          'Hello, world!',
          'Error occurs :(',
          'Hello from second!'
        ];
        Promise.all([
            component1.template.render(),
            component1.errorTemplate.render(),
            component2.template.render()
          ])
          .then(function (rendered) {
            assert.deepEqual(rendered, expected);
            done();
          })
          .catch(done);
      })
      .catch(done);
  });

  lab.test('should properly transform components', function (done) {
    var components = {
        'first-cool': {
          name: 'first-cool',
          path: 'test/cases/lib/loaders/ComponentLoader' +
          '/first/first.json',
          properties: {
            logic: './logic.js',
            errorTemplate: './templates/error.html',
            template: './templates/template.html'
          }
        },
        second: {
          name: 'second',
          path: 'test/cases/lib/loaders/ComponentLoader' +
          '/Second/second.json',
          properties: {
            logic: './index.js',
            template: './template.html'
          }
        }
      },
      locator = createLocator({
        isRelease: true
      }, components);

    locator.registerInstance('componentTransform', {
      transform: function (component) {
        component.name = component.name += '!';
        return component;
      }
    });
    locator.registerInstance('componentTransform', {
      transform: function (component) {
        component.name = component.name += '?';
        return Promise.resolve(component);
      }
    });

    var loader = locator.resolve('componentLoader');

    loader
      .load()
      .then(function (loadedComponents) {
        assert.strictEqual(
          loadedComponents, loader.getComponentsByNames()
        );
        var componentNames = Object.keys(loadedComponents);
        assert.strictEqual(componentNames.length, 2);

        var component1 = loadedComponents[componentNames[0]],
          component2 = loadedComponents[componentNames[1]];
        assert.strictEqual(
          component1.name, 'first-cool!?'
        );
        assert.strictEqual(typeof (component1.constructor), 'function');

        assert.strictEqual(component2.name, 'second!?');
        assert.strictEqual(typeof (component2.constructor), 'function');
        assert.strictEqual(component2.errorTemplate, undefined);

        var expected = [
          'Hello, world!',
          'Error occurs :(',
          'Hello from second!'
        ];
        Promise.all([
            component1.template.render(),
            component1.errorTemplate.render(),
            component2.template.render()
          ])
          .then(function (rendered) {
            assert.deepEqual(rendered, expected);
            done();
          })
          .catch(done);
      })
      .catch(done);
  });

  lab.test('should not load if component does not export function', function (done) {
    var components = {
        error1: {
          name: 'error1',
          path: 'test/cases/lib/loaders/ComponentLoader' +
          '/Error1/error1.json',
          properties: {
            logic: './index.js',
            template: './template.html'
          }
        }
      },
      locator = createLocator({
        isRelease: true
      }, components),
      loader = locator.resolve('componentLoader');

    loader
      .load()
      .then(function (loadedComponents) {
        assert.strictEqual(
          loadedComponents, loader.getComponentsByNames()
        );
        var componentNames = Object.keys(loadedComponents);
        assert.strictEqual(componentNames.length, 0);
        done();
      })
      .catch(done);
  });

  lab.test('should not load if component has wrong path in "template" field', function (done) {
    var components = {
        error3: {
          name: 'error3',
          path: 'test/cases/lib/loaders/ComponentLoader' +
          '/Error3/error3.json',
          properties: {
            logic: './index.js',
            template: './template.html'
          }
        }
      },
      locator = createLocator({
        isRelease: true
      }, components),
      loader = locator.resolve('componentLoader');

    loader
      .load()
      .then(function (loadedComponents) {
        assert.strictEqual(
          loadedComponents, loader.getComponentsByNames()
        );
        var componentNames = Object.keys(loadedComponents);
        assert.strictEqual(componentNames.length, 0);
        done();
      })
      .catch(done);
  });

  lab.test('should not load if component has no logic file', function (done) {
    var components = {
        error4: {
          name: 'error4',
          path: 'test/cases/lib/loaders/ComponentLoader' +
          '/Error4/error4.json',
          properties: {
            logic: './index.js',
            template: './template.html'
          }
        }
      },
      locator = createLocator({
        isRelease: true
      }, components),
      loader = locator.resolve('componentLoader');

    loader
      .load()
      .then(function (loadedComponents) {
        assert.strictEqual(
          loadedComponents, loader.getComponentsByNames()
        );
        var componentNames = Object.keys(loadedComponents);
        assert.strictEqual(componentNames.length, 0);
        done();
      })
      .catch(done);
  });
});

function createLocator(config, components) {
  var locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', config);
  var eventBus = new events.EventEmitter();
  eventBus.on('error', function () {});

  var templateProvider = {
    templates: {},
    compile: function (str) {
      return Promise.resolve(str);
    },
    render: function (name) {
      return Promise.resolve(templateProvider[name]);
    },
    registerCompiled: function (name, source) {
      templateProvider[name] = source;
    }
  };

  locator.registerInstance('eventBus', eventBus);
  locator.registerInstance('componentFinder', new ComponentFinder(components));
  locator.registerInstance('templateProvider', templateProvider);
  locator.register('contextFactory', ContextFactory);
  locator.register('moduleApiProvider', ModuleApiProvider);
  locator.register('cookieWrapper', CookieWrapper);
  locator.register('componentLoader', ComponentLoader);
  locator.register('logger', Logger, config);
  return locator;
}
