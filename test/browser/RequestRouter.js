var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var events = require('events');
var jsdom = require('jsdom');
var UniversalMock = require('../mocks/UniversalMock');
var ServiceLocator = require('catberry-locator');
var URLArgsProvider = require('../../lib/providers/URLArgsProvider');
var ContextFactory = require('../../lib/ContextFactory');
var CookieWrapper = require('../../browser/CookieWrapper');
var RequestRouter = require('../../browser/RequestRouter');

lab.experiment('browser/RequestRouter', () => {
  lab.experiment('#go', () => {
    var locator;

    lab.beforeEach((done) => {
      locator = new ServiceLocator();

      var eventBus = new events.EventEmitter();
      locator.registerInstance('eventBus', eventBus);
      locator.registerInstance('serviceLocator', locator);
      locator.register('cookieWrapper', CookieWrapper);

      var documentRenderer = {
        initWithState: function (context) {
          eventBus.emit('documentRendered', context);
          return Promise.resolve();
        },
        updateState: function (context) {
          eventBus.emit('stateUpdated', context);
          return Promise.resolve();
        }
      };

      locator.registerInstance('documentRenderer', documentRenderer);
      locator.registerInstance('moduleApiProvider', new UniversalMock(['redirect']));
      locator.register('urlArgsProvider', URLArgsProvider);
      locator.register('contextFactory', ContextFactory);

      done();
    });

    lab.test('If route to unmatched we must reload page', (done) => {
      var documentRenderer = locator.resolve('documentRenderer');
      var eventBus = locator.resolve('eventBus');

      locator.registerInstance('routeDefinition', {
        expression: '/'
      });

      eventBus.on('documentRendered', (context) => {
        assert.deepEqual(context.args, {});
      });


      jsdom.env({
        url: 'http://localhost',
        html: '',
        done: (err, window) => {
          locator.registerInstance('window', window);
          var router = new RequestRouter(locator);
          router.go('/invalid');

          window.location.assign = function (linkToGo) {
            assert.strictEqual(linkToGo, 'http://localhost/invalid');
          };

          wait(10)
            .then(() => {
              assert(window.history.length, 1);
              done();
            });
        }
      });
    });

    lab.test('If location changed, we must change state', (done) => {
      var documentRenderer = locator.resolve('documentRenderer');
      var eventBus = locator.resolve('eventBus');

      locator.registerInstance('routeDefinition', {
        expression: '/?some=:some'
      });

      eventBus.on('documentRendered', (context) => {
        assert.deepEqual(context.args, {});
      });

      eventBus.on('stateUpdated', (context) => {
        assert.deepEqual(context.args, { some: 'good' });
      });

      eventBus.on('error', done);

      jsdom.env({
        url: 'http://localhost',
        html: '',
        done: (err, window) => {
          locator.registerInstance('window', window);
          var router = new RequestRouter(locator);
          router.go('/?some=good');

          wait(10)
            .then(() => {
              assert(window.history.length, 2);
              done();
            });
        }
      });
    });

    lab.test('If scheme was changed, page will be reloaded', (done) => {
      var documentRenderer = locator.resolve('documentRenderer');
      var eventBus = locator.resolve('eventBus');

      locator.registerInstance('routeDefinition', {
        expression: '/'
      });

      eventBus.on('error', done);

      jsdom.env({
        url: 'http://localhost',
        html: '',
        done: (err, window) => {
          locator.registerInstance('window', window);
          var router = new RequestRouter(locator);
          router.go('https://localhost');

          window.location.assign = function (linkToGo) {
            assert.strictEqual(linkToGo, 'https://localhost');
            done();
          }
        }
      });
    });
  });
});

function wait (time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
