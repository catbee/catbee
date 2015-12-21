var Lab = require('lab');
var lab = exports.lab = Lab.script();
var { experiment, test, beforeEach } = lab;

var assert = require('assert');

var LoggerBase = require('../../../lib/base/LoggerBase');

experiment('lib/base/LoggerBase', () => {
  experiment('#_enrichments', () => {
    test('should be an array', (done) => {
      var logger:LoggerBase = new LoggerBase();

      assert(Array.isArray(logger._enrichments));

      done();
    });

    test('should be empty array by default', (done) => {
      var logger:LoggerBase = new LoggerBase();

      assert.deepEqual([], logger._enrichments);

      done();
    });
  });

  experiment('#addEnrichment', () => {
    test('should add enrichment function to _enrichments array', (done) => {
      var logger:LoggerBase = new LoggerBase();

      var another = () => {};

      function enrichment () {}

      logger.addEnrichment(enrichment);
      logger.addEnrichment(another);

      assert.deepEqual([enrichment, another], logger._enrichments);

      done();
    });

    test('should throw TypeError if enrichment is not a function', (done) => {
      var logger:LoggerBase = new LoggerBase();

      assert.throws(() => {
        logger.addEnrichment('');
      }, TypeError);

      done();
    })
  });

  experiment('#dropEnrichments', () => {
    test('should clean up all current enrichments', (done) => {
      var logger:LoggerBase = new LoggerBase();

      var another = () => {};

      function enrichment () {}

      logger.addEnrichment(enrichment);
      logger.addEnrichment(another);

      logger.dropEnrichments();

      assert.deepEqual([], logger._enrichments);

      done();
    });
  });

  experiment('#removeEnrichment', () => {
    test('should delete one enrichment by link on it', (done) => {
      var logger:LoggerBase = new LoggerBase();

      var another = () => {};

      function enrichment () {}

      function enrich () {}

      logger.addEnrichment(enrichment);
      logger.addEnrichment(another);
      logger.addEnrichment(enrich);

      logger.removeEnrichment(another);

      assert.deepEqual([enrichment, enrich], logger._enrichments);

      done();
    });
  });

  experiment('#_enrichLog', () => {
    test('should enrich log', (done) => {
      var logger:LoggerBase = new LoggerBase();

      var expected = {
        data: 'some data'
      };

      logger.addEnrichment((log) => log.data = expected.data);

      var log = {};

      logger._enrichLog(log);

      assert.deepEqual(expected, log);

      done();
    });
  });

  experiment('#_setLevels', () => {
    var logger:LoggerBase = null;

    beforeEach((done) => {
      logger = new LoggerBase();
      done();
    });

    test('should do nothing if no string/object in param', (done) => {
      var defaultLevels = logger._levels;

      logger._setLevels();

      assert.deepEqual(defaultLevels, logger._levels);

      done();
    });

    test('should parse levels in string', (done) => {
      var levels = 'error,warn,fatal';

      var expectedLevels = {
        warn: true,
        error: true,
        fatal: true
      };

      logger._setLevels(levels);

      assert.deepEqual(expectedLevels, logger._levels);

      done();
    });

    test('should use object levels as is', (done) => {
      var levels = {
        fatal: true,
        error: true
      };

      logger._setLevels(levels);

      assert.deepEqual(levels, logger._levels);

      done();
    });
  });

  experiment('#_errorFormatter', () => {
    var logger:LoggerBase = null;

    beforeEach((done) => {
      logger = new LoggerBase();
      done();
    });

    test('should parse Error object', (done) => {
      var error = new Error('error message');

      var expected = {
        message: `${error.name}: ${error.message}`,
        fields: {
          stack: error.stack
        }
      };

      var result = logger._errorFormatter(error);

      assert.deepEqual(expected, result);

      done();
    });

    test('should parse extract stack and message fields if error is object', (done) => {
      var error = {
        message: 'Error message',
        stack: 'some stackTrace'
      };

      var expected = {
        message: error.message,
        fields: {
          stack: error.stack
        }
      };

      var result = logger._errorFormatter(error);

      assert.deepEqual(expected, result);

      done();
    });

    test('should generate stackTrace if no stack in error object', (done) => {
      var error = {
        message: 'Error message'
      };

      var { fields: { stack } } = logger._errorFormatter(error);

      assert(stack);

      done();
    });

    test('should generate stackTrace if error is string', (done) => {
      var error = 'Error message';

      var { message, fields: { stack } } = logger._errorFormatter(error);

      assert.equal(message, error);
      assert(stack);

      done();
    });
  });

  experiment('#_send', () => {
    test('should throw error if .log method is not realized in inheritor', (done) => {
      var logger:LoggerBase = new LoggerBase();

      assert.throws(() => logger._send(), ReferenceError);

      done();
    })
  });
});
