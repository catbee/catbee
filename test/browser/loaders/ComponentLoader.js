var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var events = require('events');
var ServiceLocator = require('catberry-locator');
var ComponentLoader = require('../../../browser/loaders/ComponentLoader');
var ComponentFinder = require('../../mocks/finders/ComponentFinder');
var Logger = require('../../mocks/Logger');

lab.experiment('browser/loaders/ComponentLoader', function () {
  lab.test('should properly load components', function (done) {
    var locator = createLocator({
      isRelease: true
    });

    locator.registerInstance('component', {
      constructor: function ctr1() {},
      name: 'first-cool',
      properties: {
        name: 'first-cool',
        logic: './logic.js',
        errorTemplate: './templates/error.html',
        template: './templates/template.html'
      },
      templateSource: 'Hello, world!',
      errorTemplateSource: 'Error occurs :('
    });
    locator.registerInstance('component', {
      constructor: function ctr2() {},
      name: 'second',
      properties: {
        logic: './index.js',
        template: './template.html'
      },
      templateSource: 'Hello from second!',
      errorTemplateSource: null
    });

    var components = locator.resolveAll('component').reverse(),
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
          component1.name, components[0].name
        );
        assert.strictEqual(
          component1.constructor, components[0].constructor
        );

        assert.strictEqual(component2.name, components[1].name);
        assert.strictEqual(
          component2.constructor, components[1].constructor
        );
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

  lab.test('should not load components twice', function (done) {
    var locator = createLocator({
      isRelease: true
    });

    locator.registerInstance('component', {
      constructor: function ctr1() {},
      name: 'first-cool',
      properties: {
        name: 'first-cool',
        logic: './logic.js',
        errorTemplate: './templates/error.html',
        template: './templates/template.html'
      },
      templateSource: 'Hello, world!',
      errorTemplateSource: 'Error occurs :('
    });
    locator.registerInstance('component', {
      constructor: function ctr2() {},
      name: 'second',
      properties: {
        logic: './index.js',
        template: './template.html'
      },
      templateSource: 'Hello from second!',
      errorTemplateSource: null
    });

    var components = locator.resolveAll('component').reverse(),
      loader = locator.resolve('componentLoader');

    loader
      .load()
      .then(function (loadedComponents) {
        assert.strictEqual(
          loadedComponents, loader.getComponentsByNames()
        );
        var componentNames = Object.keys(loadedComponents);
        assert.strictEqual(componentNames.length, 2);

        var component1 = loadedComponents[componentNames[0]];
        assert.strictEqual(
          component1.name, components[0].name
        );
        locator.unregister('component');
        return loader.load();
      })
      .then(function (loadedComponents) {
        assert.strictEqual(
          loadedComponents, loader.getComponentsByNames()
        );
        var componentNames = Object.keys(loadedComponents);
        assert.strictEqual(componentNames.length, 2);
      })
      .then(done)
      .catch(done);
  });

  lab.test('should properly transform components', function (done) {
    var locator = createLocator({
      isRelease: true
    });

    locator.registerInstance('component', {
      constructor: function ctr1() {},
      name: 'first-cool',
      properties: {
        name: 'first-cool',
        logic: './logic.js',
        errorTemplate: './templates/error.html',
        template: './templates/template.html'
      },
      templateSource: 'Hello, world!',
      errorTemplateSource: 'Error occurs :('
    });
    locator.registerInstance('component', {
      constructor: function ctr2() {},
      name: 'second',
      properties: {
        logic: './index.js',
        template: './template.html'
      },
      templateSource: 'Hello from second!',
      errorTemplateSource: null
    });

    locator.registerInstance('componentTransform', {
      transform: function (component) {
        component.name += '!';
        return Promise.resolve(component);
      }
    });
    locator.registerInstance('componentTransform', {
      transform: function (component) {
        component.name += '?';
        return component;
      }
    });

    var components = locator.resolveAll('component').reverse(),
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
          component1.name, 'first-cool!?'
        );
        assert.strictEqual(
          component1.constructor,
          components[0].constructor
        );

        assert.strictEqual(component2.name, 'second!?');
        assert.strictEqual(
          component2.constructor,
          components[1].constructor
        );
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

  lab.test('should skip transform errors', function (done) {
    var locator = createLocator({
      isRelease: true
    });

    locator.registerInstance('component', {
      constructor: function ctr1() {},
      name: 'first-cool',
      properties: {
        name: 'first-cool',
        logic: './logic.js',
        errorTemplate: './templates/error.html',
        template: './templates/template.html'
      },
      templateSource: 'Hello, world!',
      errorTemplateSource: 'Error occurs :('
    });
    locator.registerInstance('component', {
      constructor: function ctr2() {},
      name: 'second',
      properties: {
        logic: './index.js',
        template: './template.html'
      },
      templateSource: 'Hello from second!',
      errorTemplateSource: null
    });

    locator.registerInstance('componentTransform', {
      transform: function (component) {
        component.name += '!';
        return Promise.resolve(component);
      }
    });
    locator.registerInstance('componentTransform', {
      transform: function (component) {
        if (component.name === 'second!') {
          throw new Error('test');
        }
        component.name += '?';
        return component;
      }
    });

    var components = locator.resolveAll('component').reverse(),
      loader = locator.resolve('componentLoader');

    loader
      .load()
      .then(function (loadedComponents) {
        assert.strictEqual(
          loadedComponents, loader.getComponentsByNames()
        );
        var componentNames = Object.keys(loadedComponents);
        assert.strictEqual(componentNames.length, 1);

        var component1 = loadedComponents[componentNames[0]];
        assert.strictEqual(
          component1.name, 'first-cool!?'
        );
        assert.strictEqual(
          component1.constructor,
          components[0].constructor
        );
      })
      .then(done)
      .catch(done);
  });
});

function createLocator(config) {
  var locator = new ServiceLocator();
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', config);
  var eventBus = new events.EventEmitter();
  eventBus.on('error', function () {});

  var templateProvider = {
    templates: {},
    render: function (name) {
      return Promise.resolve(templateProvider[name]);
    },
    registerCompiled: function (name, source) {
      templateProvider[name] = source;
    }
  };

  locator.registerInstance('eventBus', eventBus);
  locator.registerInstance('templateProvider', templateProvider);
  locator.register('componentLoader', ComponentLoader);
  locator.register('logger', Logger, config);
  return locator;
}
