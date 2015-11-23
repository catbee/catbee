var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var events = require('events');
var jsdom = require('jsdom');
var Logger = require('../mocks/Logger');
var UniversalMock = require('../mocks/UniversalMock');
var ServiceLocator = require('catberry-locator');
var URLArgsProvider = require('../../lib/providers/URLArgsProvider');
var ContextFactory = require('../../lib/ContextFactory');
var CookieWrapper = require('../../browser/CookieWrapper');
var RequestRouter = require('../../browser/RequestRouter');

lab.experiment('browser/RequestRouter', function () {
  lab.experiment('#route', function () {
    lab.test('should catch internal link click and change state', function (done) {
      var locator = createLocator();
      var documentRenderer = locator.resolve('documentRenderer');
      var eventBus = locator.resolve('eventBus');
      var isChecked = false;
      var link = '/some/?global=globalValue&first=firstValue&second=secondValue';

      locator.registerInstance('routeDefinition', {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test',
        args: {
          third: 'hello'
        }
      });

      eventBus.on('error', done);

      eventBus.once('documentRendered', function (state, context) {
        assert.strictEqual(typeof (context), 'object');
        assert.strictEqual(state.args.third, 'hello');
        assert.strictEqual(context.location.toString(), 'http://local/some');
        isChecked = true;
      });

      eventBus.once('stateUpdated', function (state) {
        assert.strictEqual(state.args.first, 'firstValue');
        assert.strictEqual(state.args.second, 'secondValue');
        assert.strictEqual(state.args.third, 'hello');
        assert.strictEqual(state.args.global, 'globalValue');
      });

      jsdom.env({
        html: '<a href="' + link + '"></a>',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          window.location.replace('http://local/some');
          locator.resolveInstance(RequestRouter);

          var event = window.document.createEvent('MouseEvents');
          event.initEvent('click', true, true);
          event.button = 0;

          window.document.getElementsByTagName('a')[0].dispatchEvent(event);

          setTimeout(function () {
            assert.strictEqual(isChecked, true);
            assert.strictEqual(window.location.toString(), 'http://local' + link);
            assert.strictEqual(window.history.length, 2);
            done();
          }, 10);
        }
      });
    });

    lab.test('should catch click on item inside link and change state', function (done) {
      var locator = createLocator();
      var documentRenderer = locator.resolve('documentRenderer');
      var eventBus = locator.resolve('eventBus');
      var isChecked = false;
      var link = '/some/?global=globalValue&first=firstValue&second=secondValue';

      locator.registerInstance('routeDefinition', {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test',
        args: {
          third: 'hello'
        }
      });

      eventBus.on('error', done);

      eventBus.once('documentRendered', function (state, context) {
        assert.strictEqual(typeof (context), 'object');
        assert.strictEqual(state.args.third, 'hello');
        assert.strictEqual(context.location.toString(), 'http://local/some');
        isChecked = true;
      });

      eventBus.once('stateUpdated', function (state) {
        assert.strictEqual(state.args.first, 'firstValue');
        assert.strictEqual(state.args.second, 'secondValue');
        assert.strictEqual(state.args.third, 'hello');
        assert.strictEqual(state.args.global, 'globalValue');
      });

      jsdom.env({
        html: '<a href="' + link + '"><span><div></div></span></a>',
        done: function (errors, window) {
          locator.registerInstance('window', window);
          window.location.replace('http://local/some');
          locator.resolveInstance(RequestRouter);

          var event = window.document.createEvent('MouseEvents');
          event.initEvent('click', true, true);
          event.button = 0;

          window.document.getElementsByTagName('div')[0].dispatchEvent(event);

          setTimeout(function () {
            assert.strictEqual(isChecked, true);
            assert.strictEqual(window.location.toString(), 'http://local' + link);
            assert.strictEqual(window.history.length, 2);
            done();
          }, 10);
        }
      });
    });
  });

  lab.test('should catch link click and change state if link starts with //', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');
    var isChecked = false;
    var link = '//local1.com/some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('documentRendered', function () {
      isChecked = true;
    });

    eventBus.once('stateUpdated', function (state) {
      assert.strictEqual(state.args.first, 'firstValue');
      assert.strictEqual(state.args.second, 'secondValue');
      assert.strictEqual(state.args.global, 'globalValue');
    });

    jsdom.env({
      html: '<a href="' + link + '"></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('https://local1.com/some');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);

        setTimeout(function () {
          assert.strictEqual(isChecked, true);
          assert.strictEqual(window.location.toString(), 'https:' + link);
          done();
        }, 10);
      }
    });
  });

  lab.test('should properly handle relative URIs with .. and change state', function (done) {
    var locator = createLocator();
    var documentRenderer = locator.resolve('documentRenderer');
    var eventBus = locator.resolve('eventBus');
    var isChecked = false;
    var link = '../../some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('documentRendered', function (state, context) {
      assert.strictEqual(typeof (context), 'object');
      isChecked = true;
    });

    eventBus.once('stateUpdate', function(state, context) {
      assert.strictEqual(
        context.location.toString(),
        'http://local:9090/some/?global=globalValue&first=firstValue&second=secondValue'
      );
      assert.strictEqual(state.args.first, 'firstValue');
      assert.strictEqual(state.args.second, 'secondValue');
      assert.strictEqual(state.args.global, 'globalValue');
    });

    jsdom.env({
      html: '<a href="' + link + '"></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local:9090/a/b');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);

        setTimeout(function () {
          assert.strictEqual(isChecked, true);
          assert.strictEqual(
            window.location.toString(),
            'http://local:9090/some/?global=globalValue&first=firstValue&second=secondValue'
          );
          done();
        }, 10);
      }
    });
  });

  lab.test('should not change state if link changes host', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');
    var link = 'http://local1.com/some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global[first,second]&first=:first[first]&second=:second[second]',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('stateUpdate', function () {
      assert.fail('If link changes page this event should not be triggered');
    });

    jsdom.env({
      html: '<a href="' + link + '"></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local2.com/some');
        window.location.assign = function (linkToGo) {
          assert.strictEqual(linkToGo, link);
          done();
        };
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);
      }
    });
  });

  lab.test('should not change state if link has "target" attribute', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');
    var link = 'http://local1.com/some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('stateUpdated', function () {
      assert.fail('If link changes page this event should not be triggered');
    });

    jsdom.env({
      html: '<a href="' + link + '" target="_blank"></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local1.com/some');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);

        setTimeout(function () {
          assert.strictEqual(window.location.toString(), 'http://local1.com/some');
          done();
        }, 10);
      }
    });
  });

  lab.test('should not change state if click on element that is not inside the link', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');
    var link = 'http://local1.com/some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('stateUpdated', function () {
      assert.fail('If link changes page this event should not be triggered');
    });

    jsdom.env({
      html: '<a href="' + link + '"></a>' +
      '<span><div></div></span>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local1.com/some');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;

        window.document.getElementsByTagName('div')[0].dispatchEvent(event);

        setTimeout(function () {
          assert.strictEqual(window.location.toString(), 'http://local1.com/some');
          done();
        }, 10);
      }
    });
  });

  lab.test('should not change state if link has been clicked by middle mouse button', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');
    var link = 'http://local1.com/some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('stateUpdated', function () {
      assert.fail('If link changes page this event should not be triggered');
    });

    jsdom.env({
      html: '<a href="' + link + '"></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local1.com/some');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 1;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);
        setTimeout(function () {
          assert.strictEqual(window.location.toString(), 'http://local1.com/some');
          done();
        }, 10);
      }
    });
  });

  lab.test('should not change state if link has been clicked with Control', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');
    var link = 'http://local1.com/some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('stateUpdated', function () {
      assert.fail('If link changes page this event should not be triggered');
    });

    jsdom.env({
      html: '<a href="' + link + '"></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local1.com/some');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;
        event.ctrlKey = true;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);
        setTimeout(function () {
          assert.strictEqual(window.location.toString(), 'http://local1.com/some');
          done();
        }, 10);
      }
    });
  });

  lab.test('should not change state if link has been clicked with Alt', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');
    var link = 'http://local1.com/some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition', {
      expression: '/some/?global=:global&first=:first&second=:second',
      signal: 'test'
    });

    eventBus.on('error', done);
    eventBus.once('stateUpdated', function () {
      assert.fail('If link changes page this event should not be triggered');
    });

    jsdom.env({
      html: '<a href="' + link + '"></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local1.com/some');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;
        event.altKey = true;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);
        setTimeout(function () {
          assert.strictEqual(window.location.toString(), 'http://local1.com/some');
          done();
        }, 10);
      }
    });
  });

  lab.test('should not change state if link has been clicked with Shift', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');
    var link = 'http://local1.com/some/?global=globalValue&first=firstValue&second=secondValue';

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('stateUpdated', function () {
      assert.fail('If link changes page this event should not be triggered');
    });

    jsdom.env({
      html: '<a href="' + link + '"></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local1.com/some');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;
        event.shiftKey = true;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);
        setTimeout(function () {
          assert.strictEqual(window.location.toString(), 'http://local1.com/some');
          done();
        }, 10);
      }
    });
  });

  lab.test('should not change state if link does not have "href" attribute', function (done) {
    var locator = createLocator();
    var eventBus = locator.resolve('eventBus');
    var documentRenderer = locator.resolve('documentRenderer');

    locator.registerInstance('routeDefinition',
      {
        expression: '/some/?global=:global&first=:first&second=:second',
        signal: 'test'
      }
    );

    eventBus.on('error', done);
    eventBus.once('stateUpdated', function () {
      assert.fail('If link changes page this event should not be triggered');
    });

    jsdom.env({
      html: '<a></a>',
      done: function (errors, window) {
        locator.registerInstance('window', window);
        window.location.replace('http://local1.com/some');
        locator.resolveInstance(RequestRouter);

        var event = window.document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        event.button = 0;

        window.document.getElementsByTagName('a')[0].dispatchEvent(event);
        setTimeout(function () {
          assert.strictEqual(window.location.toString(), 'http://local1.com/some');
          done();
        }, 10);
      }
    });
  });
});

function createLocator() {
  var locator = new ServiceLocator();

  var eventBus = new events.EventEmitter();
  locator.registerInstance('eventBus', eventBus);
  locator.registerInstance('serviceLocator', locator);
  locator.register('logger', Logger);
  locator.register('cookieWrapper', CookieWrapper);

  var documentRenderer = {
    initWithState: function (state, context) {
      eventBus.emit('documentRendered', state, context);
      return Promise.resolve();
    },
    updateState: function(state, context) {
      eventBus.emit('stateUpdated', state, context);
      return Promise.resolve();
    }
  };

  locator.registerInstance('documentRenderer', documentRenderer);
  locator.registerInstance('moduleApiProvider', new UniversalMock(['redirect']));
  locator.register('urlArgsProvider', URLArgsProvider);
  locator.register('contextFactory', ContextFactory);
  return locator;
}
