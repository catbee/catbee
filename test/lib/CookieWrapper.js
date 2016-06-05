var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var CookieWrapper = require('../../lib/CookieWrapper');

lab.experiment('lib/CookieWrapper', () => {
  lab.experiment('#get', () => {
    lab.test('should return empty string if cookie string is null', (done) => {
      var cookieWrapper = new CookieWrapper();
      cookieWrapper.initWithString(null);
      assert.strictEqual(cookieWrapper.get('some'), '');
      done();
    });

    lab.test('should return empty string if cookie key is not a string', (done) => {
      var cookieWrapper = new CookieWrapper();
      cookieWrapper.initWithString('some=value;');
      assert.strictEqual(cookieWrapper.get({}), '');
      done();
    });

    lab.test('should return value if cookie string is right', (done) => {
      var cookieWrapper = new CookieWrapper();
      cookieWrapper.initWithString('some=value; some2=value2');
      assert.strictEqual(cookieWrapper.get('some'), 'value');
      assert.strictEqual(cookieWrapper.get('some2'), 'value2');
      done();
    });

    lab.test('should return empty string if cookie string is wrong', (done) => {
      var cookieWrapper = new CookieWrapper();
      cookieWrapper.initWithString('fasdfa/gafg-sgafga');
      assert.strictEqual(cookieWrapper.get('fasdfa/gafg-sgafga'), '');
      done();
    });
  });

  lab.experiment('#set', () => {
    lab.test('should set cookie by specified parameters', (done) => {
      var cookieWrapper = new CookieWrapper(),
        expiration = new Date(),
        expected = 'some=value' +
          '; Max-Age=100' +
          '; Expires=' +
          expiration.toUTCString() +
          '; Path=/some' +
          '; Domain=.new.domain' +
          '; Secure; HttpOnly';

      cookieWrapper.initWithString(null);

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

      assert.strictEqual(cookieWrapper.setCookie.length, 1);
      assert.strictEqual(cookieWrapper.setCookie[0], expected);
      done();
    });

    lab.test('should set several cookies by specified parameters', (done) => {
      var cookieWrapper = new CookieWrapper(),
        expected1 = 'some=value',
        expected2 = 'some2=value2';

      cookieWrapper.initWithString(null);

      cookieWrapper.set({
        key: 'some',
        value: 'value'
      });
      cookieWrapper.set({
        key: 'some2',
        value: 'value2'
      });

      assert.strictEqual(cookieWrapper.setCookie.length, 2);
      assert.strictEqual(cookieWrapper.setCookie[0], expected1);
      assert.strictEqual(cookieWrapper.setCookie[1], expected2);
      done();
    });

    lab.test('should set default expire date by max age', (done) => {
      var cookieWrapper = new CookieWrapper(),
        expiration = new Date(Date.now() + 3600000),
        expected = 'some=value' +
          '; Max-Age=3600' +
          '; Expires=' +
          expiration.toUTCString();

      cookieWrapper.set({
        key: 'some',
        value: 'value',
        maxAge: 3600
      });

      assert.strictEqual(cookieWrapper.setCookie.length, 1);
      assert.strictEqual(cookieWrapper.setCookie[0], expected);
      done();
    });

    lab.test('should throw error if wrong key', (done) => {
      var cookieWrapper = new CookieWrapper();

      assert.throws(function () {
        cookieWrapper.set({
          key: {}
        });
      }, Error);
      done();
    });

    lab.test('should throw error if wrong value', (done) => {
      var cookieWrapper = new CookieWrapper();

      assert.throws(function () {
        cookieWrapper.set({
          key: 'some',
          value: {}
        });
      }, Error);
      done();
    });
  });

  lab.experiment('#getCookieString', () => {
    lab.test('should return right cookie string with init', (done) => {
      var cookieWrapper = new CookieWrapper();
      cookieWrapper.initWithString('some=value; some2=value2');
      assert.strictEqual(
        cookieWrapper.getCookieString(),
        'some=value; some2=value2'
      );
      done();
    });

    lab.test('should return right cookie string without init but with set', (done) => {
      var cookieWrapper = new CookieWrapper();
      cookieWrapper.set({
        key: 'some3',
        value: 'value3'
      });
      cookieWrapper.set({
        key: 'some4',
        value: 'value4'
      });
      assert.strictEqual(
        cookieWrapper.getCookieString(),
        'some3=value3; some4=value4'
      );
      done();
    });

    lab.test('should return right cookie string after init and set', (done) => {
      var cookieWrapper = new CookieWrapper();
      cookieWrapper.initWithString('some=value; some2=value2');
      cookieWrapper.set({
        key: 'some3',
        value: 'value3'
      });
      cookieWrapper.set({
        key: 'some4',
        value: 'value4'
      });
      assert.strictEqual(
        cookieWrapper.getCookieString(),
        'some=value; some2=value2; some3=value3; some4=value4'
      );
      done();
    });
  });

  lab.experiment('#getAll', () => {
    lab.test('should return right cookie string', (done) => {
      var cookieWrapper = new CookieWrapper();
      cookieWrapper.initWithString('some=value; some2=value2');
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
