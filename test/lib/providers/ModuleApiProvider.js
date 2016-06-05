var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var events = require('events');
var ServiceLocator = require('catberry-locator');
var CookieWrapper = require('../../../lib/CookieWrapper');
var ModuleApiProvider = require('../../../lib/providers/ModuleApiProvider');

lab.experiment('lib/providers/ModuleApiProvider', function () {
  lab.experiment('#on', function () {
    lab.test('should throw error if handler is not a function', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.throws(function () {
        api.on('some', {});
      }, Error);
      done();
    });

    lab.test('should throw error if event name is not a string', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.throws(function () {
        api.on({}, function () {});
      }, Error);
      done();
    });

    lab.test('should properly register handler on event', function (done) {
      var locator = createLocator();
      var bus = locator.resolve('eventBus');
      var api = new ModuleApiProvider(locator);

      api.on('event', function (arg) {
        assert.strictEqual(arg, 'hello');
        done();
      });
      bus.emit('event', 'hello');
    });
  });

  lab.experiment('#once', function () {
    lab.test('should throw error if handler is not a function', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.throws(function () {
        api.once('some', {});
      }, Error);
      done();
    });

    lab.test('should throw error if event name is not a string', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.throws(function () {
        api.once({}, function () {});
      }, Error);
      done();
    });

    lab.test('should properly register handler on event', function (done) {
      var locator = createLocator();
      var bus = locator.resolve('eventBus');
      var api = new ModuleApiProvider(locator);

      var was = false;
      api.once('event', function (arg) {
        if (was) {
          assert.fail();
        }
        was = true;
        assert.strictEqual(arg, 'hello');
      });
      bus.emit('event', 'hello');
      assert.strictEqual(was, true);
      done();
    });
  });

  lab.experiment('#removeListener', function () {
    lab.test('should throw error if handler is not a function', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.throws(function () {
        api.removeListener('some', {});
      }, Error);
      done();
    });

    lab.test('should throw error if event name is not a string', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.throws(function () {
        api.removeListener({}, function () {});
      }, Error);
      done();
    });

    lab.test('should properly remove listener', function (done) {
      var locator = createLocator();
      var bus = locator.resolve('eventBus');
      var api = new ModuleApiProvider(locator);

      var was = false,
        handler = function () {
          was = true;
        };

      api.on('event', handler);
      api.removeListener('event', handler);
      bus.emit('event', 'hello');
      assert.strictEqual(was, false);
      done();
    });
  });

  lab.experiment('#removeAllListeners', function () {
    lab.test('should throw error if event name is not a string', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.throws(function () {
        api.removeAllListeners({});
      }, Error);
      done();
    });

    lab.test('should properly remove all listeners', function (done) {
      var locator = createLocator();
      var bus = locator.resolve('eventBus');
      var api = new ModuleApiProvider(locator);

      var was = false,
        handler1 = function () {
          was = true;
        },
        handler2 = function () {
          was = true;
        };

      api.on('event', handler1);
      api.on('event', handler2);
      api.removeAllListeners('event');
      bus.emit('event', 'hello');
      assert.strictEqual(was, false);
      done();
    });
  });

  lab.experiment('#redirect', function () {
    lab.test('should save last redirected URI', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.strictEqual(api.redirect('/some1') instanceof Promise, true);
      assert.strictEqual(api.redirect('/some2') instanceof Promise, true);
      assert.strictEqual(api.actions.redirectedTo, '/some2');
      done();
    });
  });

  lab.experiment('#clearFragment', function () {
    lab.test('should save flag that hash has been cleared', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      assert.strictEqual(api.actions.isFragmentCleared, false);
      assert.strictEqual(api.clearFragment() instanceof Promise, true);
      assert.strictEqual(api.actions.isFragmentCleared, true);
      done();
    });
  });

  lab.experiment('#getInlineScript', function () {
    lab.test('should return browser script for redirection', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      api.redirect('http://some');
      var expected = '<script>' +
        'window.location.assign(\'http://some\');' +
        '</script>';
      assert.strictEqual(api.getInlineScript(), expected);
      done();
    });

    lab.test('should return browser script for cookies', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      api.cookie.set({
        key: 'some1',
        value: 'value1'
      });
      api.cookie.set({
        key: 'some2',
        value: 'value2'
      });
      var expected = '<script>' +
        'window.document.cookie = \'some1=value1\';' +
        'window.document.cookie = \'some2=value2\';' +
        '</script>';
      assert.strictEqual(api.getInlineScript(), expected);
      done();
    });

    lab.test('should return browser script for clearing fragment', function (done) {
      var locator = createLocator();
      var api = new ModuleApiProvider(locator);

      api.clearFragment();
      var expected = '<script>' +
        'window.location.hash = \'\';' +
        '</script>';
      assert.strictEqual(api.getInlineScript(), expected);
      done();
    });
  });
});

function createLocator() {
  var locator = new ServiceLocator();

  locator.register('cookieWrapper', CookieWrapper);
  locator.registerInstance('serviceLocator', locator);
  locator.registerInstance('eventBus', new events.EventEmitter());

  return locator;
}
