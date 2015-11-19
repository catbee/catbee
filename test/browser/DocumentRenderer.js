var Lab = require('lab');
var lab = exports.lab = Lab.script();
var fs = require('fs');
var assert = require('assert');
var events = require('events');
var jsdom = require('jsdom');
var Logger = require('../mocks/Logger');
var Component = require('../mocks/Component');
var ComponentAsync = require('../mocks/ComponentAsync');
var ComponentError = require('../mocks/ComponentError');
var ComponentErrorAsync = require('../mocks/ComponentErrorAsync');
var ContextFactory = require('../../lib/ContextFactory');
var ModuleApiProvider = require('../../lib/providers/ModuleApiProvider');
var CookieWrapper = require('../../browser/CookieWrapper');
var ComponentLoader = require('../../browser/loaders/ComponentLoader');
var DocumentRenderer = require('../../browser/DocumentRenderer');
var ServiceLocator = require('catberry-locator');
var appstate = require('appstate');

lab.experiment('browser/DocumentRenderer', function () {
  lab.experiment('#initWithState', function () {
    lab.test('should init and bind all components in right order', function (done) {
      var html = fs.readFileSync(__dirname + '/../cases/browser/DocumentRenderer/initWithState.html');

      var bindCalls = [];

      function NestComponent() {}

      NestComponent.prototype.bind = function () {
        var id = this.$context.attributes.id ?
        '-' + this.$context.attributes.id : '';
        bindCalls.push(this.$context.name + id);
      };

      var components = [
        {
          name: 'comp',
          constructor: NestComponent,
          templateSource: ''
        },
        {
          name: 'head',
          constructor: NestComponent,
          templateSource: ''
        },
        {
          name: 'document',
          constructor: NestComponent,
          templateSource: ''
        }
      ];

      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var expected = [
        'comp-1',
        'comp-2',
        'comp-3',
        'comp-4',
        'comp-5',
        'comp-6',
        'comp-7',
        'comp-8',
        'comp-9',
        'comp-10',
        'comp-11',
        'comp-12',
        'comp-13',
        'comp-14',
        'comp-15',
        'comp-16',
        'comp-17',
        'comp-18',
        'head',
        'document'
      ];

      eventBus.on('error', done);
      jsdom.env({
        html: html,
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          renderer.initWithState({}, {})
            .then(function () {
              assert.deepEqual(bindCalls, expected);
              done();
            })
            .catch(done);
        }
      });
    });
  });

  lab.experiment('#renderComponent', function () {
    lab.test('should render component into HTML element', function (done) {
      var components = [
        {
          name: 'test',
          constructor: Component,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var expected = 'test<br><div>Hello, World!</div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, expected);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render asynchronous component into HTML element', function (done) {
      var components = [
        {
          name: 'test-async',
          constructor: ComponentAsync,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var expected = 'test-async<br><div>Hello, World!</div>';
      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, expected);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render debug output instead the content when error in debug mode', function (done) {
      var components = [
        {
          name: 'test',
          constructor: ComponentError,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var check = /Error: test/;

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'test');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test');
          element.setAttribute('id', 'unique');

          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(check.test(element.innerHTML), true);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render debug output instead the content when error in debug mode', function (done) {
      var components = [
        {
          name: 'test-async',
          constructor: ComponentErrorAsync,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {});
      var eventBus = locator.resolve('eventBus');

      var check = /Error: test-async/;

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'test-async');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(check.test(element.innerHTML), true);
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render empty string instead the content when error in release mode', function (done) {
      var components = [
        {
          name: 'test-async',
          constructor: ComponentErrorAsync,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, {
        isRelease: true
      });
      var eventBus = locator.resolve('eventBus');

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'test-async');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, '');
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should render empty string instead the content when error in release mode', function (done) {
      var components = [
        {
          name: 'test-async',
          constructor: ComponentErrorAsync,
          templateSource: '<div>Hello, World!</div>'
        }
      ];
      var locator = createLocator(components, { isRelease: true });
      var eventBus = locator.resolve('eventBus');

      eventBus.on('error', function (error) {
        assert.strictEqual(error.message, 'test-async');
      });

      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, '');
              done();
            })
            .catch(done);
        }
      });
    });

    lab.test('should do nothing if there is no such component', function (done) {
      var components = [];
      var locator = createLocator(components, { isRelease: true });
      var eventBus = locator.resolve('eventBus');


      eventBus.on('error', done);
      jsdom.env({
        html: ' ',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          var renderer = locator.resolveInstance(DocumentRenderer);
          var element = window.document.createElement('cat-test-async');

          element.setAttribute('id', 'unique');
          renderer.renderComponent(element)
            .then(function () {
              assert.strictEqual(element.innerHTML, '');
              done();
            })
            .catch(done);
        }
      });
    });
  });
});

function createLocator(components, config, watchers, actions = []) {
  var locator = new ServiceLocator();

  components.forEach(function (component) {
    locator.registerInstance('component', component);
  });

  locator.registerInstance('signalLoader', {
    load: function () {
      return Promise.resolve();
    },
    getSignalsByNames: function () {
      var name = 'test';
      var fn = appstate.create(name, actions);
      var signals = Object.create(null);
      signals[name] = fn;
      return signals;
    }
  });

  locator.registerInstance('watcherLoader', {
    load: function () {
      return Promise.resolve();
    },
    getWatchersByNames: function () {
      return watchers;
    }
  });

  locator.register('componentLoader', ComponentLoader, config, true);
  locator.register('contextFactory', ContextFactory, config, true);
  locator.register('moduleApiProvider', ModuleApiProvider, config);
  locator.register('cookieWrapper', CookieWrapper, config);
  locator.register('logger', Logger);
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('config', config);
  locator.registerInstance('eventBus', new events.EventEmitter());

  var templates = {};
  locator.registerInstance('templateProvider', {
    registerCompiled: function (name, compiled) {
      templates[name] = compiled;
    },
    render: function (name, context) {
      return Promise.resolve(
        context.name + '<br>' + templates[name]
      );
    }
  });
  return locator;
}
