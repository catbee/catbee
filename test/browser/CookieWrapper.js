var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var ServiceLocator = require('catberry-locator');
var CookieWrapper = require('../../browser/CookieWrapper');

lab.experiment('browser/CookieWrapper', function () {
  lab.experiment('#get', function () {
    lab.test('should return empty string if cookie string is null', function (done) {
      var locator = createLocator(null),
        cookieWrapper = locator.resolveInstance(CookieWrapper);

      assert.strictEqual(cookieWrapper.get('some'), '');
      done();
    });
    lab.test('should return empty string if cookie key is not a string', function (done) {
      var locator = createLocator('some=value;'),
        cookieWrapper = locator.resolveInstance(CookieWrapper);
      assert.strictEqual(cookieWrapper.get({}), '');
      done();
    });
    lab.test('should return value if cookie string is right', function (done) {
      var locator = createLocator('some=value; some2=value2'),
        cookieWrapper = locator.resolveInstance(CookieWrapper);

      assert.strictEqual(cookieWrapper.get('some'), 'value');
      assert.strictEqual(cookieWrapper.get('some2'), 'value2');
      done();
    });
    lab.test('should return empty string if cookie string is wrong', function (done) {
      var locator = createLocator('fasdfa/gafg-sgafga'),
        cookieWrapper = locator.resolveInstance(CookieWrapper);

      assert.strictEqual(cookieWrapper.get('fasdfa/gafg-sgafga'), '');
      done();
    });
  });
  lab.experiment('#set', function () {
    lab.test('should set cookie by specified parameters', function (done) {
      var locator = createLocator(null),
        cookieWrapper = locator.resolveInstance(CookieWrapper),
        expiration = new Date(),
        window = locator.resolve('window'),
        expected = 'some=value' +
          '; Max-Age=100' +
          '; Expires=' +
          expiration.toUTCString() +
          '; Path=/some' +
          '; Domain=.new.domain' +
          '; Secure; HttpOnly';

      cookieWrapper.set({
        key: 'some',
        value: 'value',
        maxAge: 100,
        expires: expiration,
        domain: '.new.domain',
        path: '/some',
        secure: true,
        httpOnly: true
      });

      assert.strictEqual(window.document.cookie, expected);
      done();
    });
    lab.test('should set default expire date by max age', function (done) {
      var locator = createLocator(null),
        cookieWrapper = locator.resolveInstance(CookieWrapper),
        expiration = new Date(Date.now() + 3600000),
        window = locator.resolve('window'),
        expected = 'some=value' +
          '; Max-Age=3600' +
          '; Expires=' +
          expiration.toUTCString();

      cookieWrapper.set({
        key: 'some',
        value: 'value',
        maxAge: 3600
      });

      assert.strictEqual(window.document.cookie, expected);
      done();
    });
    lab.test('should throw error if wrong key', function (done) {
      var locator = createLocator(null),
        cookieWrapper = locator.resolveInstance(CookieWrapper);

      assert.throws(function () {
        cookieWrapper.set({
          key: {}
        });
      }, Error);
      done();
    });
    lab.test('should throw error if wrong value', function (done) {
      var locator = createLocator(null),
        cookieWrapper = locator.resolveInstance(CookieWrapper);

      assert.throws(function () {
        cookieWrapper.set({
          key: 'some',
          value: {}
        });
      }, Error);
      done();
    });
  });
  lab.experiment('#getCookieString', function () {
    lab.test('should return right cookie string', function (done) {
      var locator = createLocator('some=value; some2=value2'),
        cookieWrapper = locator.resolveInstance(CookieWrapper);

      assert.strictEqual(
        cookieWrapper.getCookieString(),
        'some=value; some2=value2'
      );
      done();
    });
  });
  lab.experiment('#getAll', function () {
    lab.test('should return right cookie string', function (done) {
      var locator = createLocator('some=value; some2=value2'),
        cookieWrapper = locator.resolveInstance(CookieWrapper);

      assert.deepEqual(
        cookieWrapper.getAll(), {
          some: 'value',
          some2: 'value2'
        }
      );
      done();
    });
  });
});

function createLocator(cookieString) {
  var locator = new ServiceLocator();
  locator.registerInstance('window', {
    document: {
      cookie: cookieString
    }
  });
  return locator;
}
