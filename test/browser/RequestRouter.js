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

    lab.test('If location not changed, document will not update state', (done) => {
      var documentRenderer = locator.resolve('documentRenderer');

      locator.registerInstance('routeDefinition', {
        expression: '/'
      });

      jsdom.env({
        url: 'http://localhost',
        html: 'Test',
        done: (err, window) => {
          locator.registerInstance('window', window);
          var router = new RequestRouter(locator);
          router.go('/invalid');

          wait(10)
            .then(() => {

              done();
            });
        }
      })
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
