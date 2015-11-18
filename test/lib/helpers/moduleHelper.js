var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('assert');
var moduleHelper = require('../../../lib/helpers/moduleHelper');

lab.experiment('lib/helpers/moduleHelper', function () {
  lab.experiment('#getNameForErrorTemplate', function () {
    lab.test('should return name with postfix', function (done) {
      var templateName = moduleHelper.getNameForErrorTemplate(
        'some'
      );
      assert.strictEqual(
        templateName,
        'some' + moduleHelper.COMPONENT_ERROR_TEMPLATE_POSTFIX
      );
      done();
    });
    lab.test('should return empty string for null value', function (done) {
      var templateName = moduleHelper.getNameForErrorTemplate(null);
      assert.strictEqual(templateName, '');
      done();
    });
  });

  lab.experiment('#getCamelCaseName', function () {
    lab.test('should convert name to camel case with prefix', function (done) {
      var badName = 'awesome-module_name',
        camelCaseName = moduleHelper.getCamelCaseName('some', badName);

      assert.strictEqual(camelCaseName, 'someAwesomeModuleName');
      done();
    });

    lab.test('should convert name to camel without prefix', function (done) {
      var badName = 'awesome-module_name',
        camelCaseName1 = moduleHelper.getCamelCaseName(null, badName),
        camelCaseName2 = moduleHelper.getCamelCaseName('', badName);

      assert.strictEqual(camelCaseName1, 'awesomeModuleName');
      assert.strictEqual(camelCaseName2, 'awesomeModuleName');
      done();
    });

    lab.test('should return string with prefix if input is in camel case', function (done) {
      var camelCaseName = moduleHelper.getCamelCaseName(
        'some', 'awesomeModuleName'
      );

      assert.strictEqual(camelCaseName, 'someAwesomeModuleName');
      done();
    });

    lab.test('should return input string if input is in camel case', function (done) {
      var camelCaseName = moduleHelper.getCamelCaseName(
        null, 'awesomeModuleName'
      );

      assert.strictEqual(camelCaseName, 'awesomeModuleName');
      done();
    });

    lab.test('should handle separators at the end', function (done) {
      var camelCaseName = moduleHelper.getCamelCaseName(
        null, 'awesome-module-name-'
      );

      assert.strictEqual(camelCaseName, 'awesomeModuleName');
      done();
    });

    lab.test('should return empty string if input is empty', function (done) {
      var camelCaseName1 = moduleHelper.getCamelCaseName(null, null),
        camelCaseName2 = moduleHelper.getCamelCaseName('', '');

      assert.strictEqual(camelCaseName1, '');
      assert.strictEqual(camelCaseName2, '');
      done();
    });
  });

  lab.experiment('#getOriginalComponentName', function () {
    lab.test('should return name without prefix', function (done) {
      var originalName = moduleHelper.getOriginalComponentName(
        moduleHelper.COMPONENT_PREFIX + 'some'
      );
      assert.strictEqual(originalName, 'some');
      done();
    });
    lab.test('should return empty string for null value', function (done) {
      var originalName = moduleHelper.getOriginalComponentName(null);
      assert.strictEqual(originalName, '');
      done();
    });
  });

  lab.experiment('#getTagNameForComponentName', function () {
    lab.test('should return name with prefix', function (done) {
      var tagName = moduleHelper.getTagNameForComponentName(
        'some'
      );
      assert.strictEqual(
        tagName, moduleHelper.COMPONENT_PREFIX.toUpperCase() + 'SOME'
      );
      done();
    });
    lab.test('should return name without prefix for HEAD', function (done) {
      var tagName = moduleHelper.getTagNameForComponentName(
        'head'
      );
      assert.strictEqual(tagName, 'HEAD');
      done();
    });
    lab.test('should return name HTML without prefix for document', function (done) {
      var tagName = moduleHelper.getTagNameForComponentName(
        'document'
      );
      assert.strictEqual(
        tagName, moduleHelper.DOCUMENT_ELEMENT_NAME.toUpperCase()
      );
      done();
    });
    lab.test('should return empty string for null value', function (done) {
      var tagName = moduleHelper.getTagNameForComponentName(null);
      assert.strictEqual(tagName, '');
      done();
    });
  });

  lab.experiment('#getMethodToInvoke', function () {
    lab.test('should find method in module', function (done) {
      var module = {
          someMethodToInvoke: function () {
            return 'hello';
          }
        },
        name = 'method-to-invoke',
        method = moduleHelper.getMethodToInvoke(module, 'some', name);

      assert.strictEqual(typeof (method), 'function');
      assert.strictEqual(method(), 'hello');
      done();
    });

    lab.test('should find default method in module and pass name into it', function (done) {
      var name = 'method-to-invoke',
        module = {
          some: function (passedName) {
            assert.strictEqual(passedName, name);
            return 'hello';
          }
        },
        method = moduleHelper.getMethodToInvoke(
          module, 'some', name
        );

      assert.strictEqual(typeof (method), 'function');
      assert.strictEqual(method(), 'hello');
      done();
    });

    lab.test('should return method with promise if do not find in module', function (done) {
      var module = {
        },
        name = 'method-to-invoke',
        method = moduleHelper.getMethodToInvoke(
          module, 'some', name
        );

      assert.strictEqual(typeof (method), 'function');
      assert.strictEqual(method() instanceof Promise, true);
      done();
    });

    lab.test('should return method with promise if arguments are wrong', function (done) {
      var module = null,
        name = '',
        method = moduleHelper.getMethodToInvoke(
          module, 'some', name
        );

      assert.strictEqual(typeof (method), 'function');
      assert.strictEqual(method() instanceof Promise, true);
      done();
    });
  });
});
