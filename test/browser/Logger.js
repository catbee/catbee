var Lab = require('lab');
var lab = exports.lab = Lab.script();
var { experiment, test, beforeEach } = lab;

var assert = require('assert');

var Logger = require('../../browser/Logger');

experiment('browser/Logger', () => {
  experiment('#_transports', () => {
    test('should be an array', (done) => {
      var logger:Logger = new Logger({});

      assert(Array.isArray(logger._transports));

      done();
    });
  });

  experiment('#dropTransports', () => {
    test('should drop all currents transports', (done) => {
      var logger:Logger = new Logger({});

      logger.addTransport(() => {});
      logger.addTransport(() => {});
      logger.addTransport(() => {});

      logger.dropTransports();

      assert.deepEqual([], logger._transports);

      done();
    });
  });

  experiment('#addTransport', () => {
    test('should add transport', (done) => {
      var logger:Logger = new Logger({});

      logger.dropTransports();

      function transport () {}

      logger.addTransport(transport);

      assert.deepEqual([transport], logger._transports);

      done()
    });

    test('should throws if not a function', (done) => {
      var logger:Logger = new Logger({});

      assert.throws(() => logger.addTransport(''), TypeError);

      done()
    })
  });

  experiment('#fatal', () => {
    test('should send message to _error', (done) => {
      var logger:Logger = new Logger({});
      var messageString = 'message';
      var metaObject = { h: 0 };

      logger._error = (level, message, meta) => {
        assert.equal('fatal', level);
        assert.equal(messageString, message);
        assert.deepEqual(metaObject, meta);

        done();
      };

      logger.fatal(messageString, metaObject);
    });

    test('should send object in meta if not presented', (done) => {
      var logger:Logger = new Logger({});

      logger._error = (level, message, meta) => {
        assert.deepEqual({}, meta);

        done();
      };

      logger.fatal('anything message');
    });

    test('should not send log if logger._levels.fatal == false', (done) => {
      var logger:Logger = new Logger({});
      var sendStatus = false;

      logger._levels.fatal = false;

      logger._error = () => {
        sendStatus = true;
      };

      logger.fatal('anything message');

      assert.equal(false, sendStatus);

      done();
    });
  });

  experiment('#error', () => {
    test('should send message to _error', (done) => {
      var logger:Logger = new Logger({});
      var messageString = 'message';
      var metaObject = { h: 0 };

      logger._error = (level, message, meta) => {
        assert.equal('error', level);
        assert.equal(messageString, message);
        assert.deepEqual(metaObject, meta);

        done();
      };

      logger.error(messageString, metaObject);
    });

    test('should send object in meta if not presented', (done) => {
      var logger:Logger = new Logger({});

      logger._error = (level, message, meta) => {
        assert.deepEqual({}, meta);

        done();
      };

      logger.error('anything message');
    });

    test('should not send log if logger._levels.error == false', (done) => {
      var logger:Logger = new Logger({});
      var sendStatus = false;

      logger._levels.error = false;

      logger._error = () => {
        sendStatus = true;
      };

      logger.error('anything message');

      assert.equal(false, sendStatus);

      done();
    });
  });

  experiment('#warn', () => {
    test('should send message to _message', (done) => {
      var logger:Logger = new Logger({});
      var messageString = 'message';
      var metaObject = { h: 0 };

      logger._message = (level, message, meta) => {
        assert.equal('warn', level);
        assert.equal(messageString, message);
        assert.deepEqual(metaObject, meta);

        done();
      };

      logger.warn(messageString, metaObject);
    });

    test('should send object in meta if not presented', (done) => {
      var logger:Logger = new Logger({});

      logger._message = (level, message, meta) => {
        assert.deepEqual({}, meta);

        done();
      };

      logger.warn('anything message');
    });

    test('should not send log if logger._levels.warn == false', (done) => {
      var logger:Logger = new Logger({});
      var sendStatus = false;

      logger._levels.warn = false;

      logger._message = () => {
        sendStatus = true;
      };

      logger.warn('anything message');

      assert.equal(false, sendStatus);

      done();
    });
  });

  experiment('#info', () => {
    test('should send message to _message', (done) => {
      var logger:Logger = new Logger({});
      var messageString = 'message';
      var metaObject = { h: 0 };

      logger._message = (level, message, meta) => {
        assert.equal('info', level);
        assert.equal(messageString, message);
        assert.deepEqual(metaObject, meta);

        done();
      };

      logger.info(messageString, metaObject);
    });

    test('should send object in meta if not presented', (done) => {
      var logger:Logger = new Logger({});

      logger._message = (level, message, meta) => {
        assert.deepEqual({}, meta);

        done();
      };

      logger.info('anything message');
    });

    test('should not send log if logger._levels.info == false', (done) => {
      var logger:Logger = new Logger({});
      var sendStatus = false;

      logger._levels.info = false;

      logger._message = () => {
        sendStatus = true;
      };

      logger.info('anything message');

      assert.equal(false, sendStatus);

      done();
    });
  });

  experiment('#debug', () => {
    test('should send message to _message', (done) => {
      var logger:Logger = new Logger({});
      var messageString = 'message';
      var metaObject = { h: 0 };

      logger._message = (level, message, meta) => {
        assert.equal('debug', level);
        assert.equal(messageString, message);
        assert.deepEqual(metaObject, meta);

        done();
      };

      logger.debug(messageString, metaObject);
    });

    test('should send object in meta if not presented', (done) => {
      var logger:Logger = new Logger({});

      logger._message = (level, message, meta) => {
        assert.deepEqual({}, meta);

        done();
      };

      logger.debug('anything message');
    });

    test('should not send log if logger._levels.debug == false', (done) => {
      var logger:Logger = new Logger({});
      var sendStatus = false;

      logger._levels.debug = false;

      logger._message = () => {
        sendStatus = true;
      };

      logger.debug('anything message');

      assert.equal(false, sendStatus);

      done();
    });
  });

  experiment('#trace', () => {
    test('should send message to _message', (done) => {
      var logger:Logger = new Logger({});
      var messageString = 'message';
      var metaObject = { h: 0 };

      logger._message = (level, message, meta) => {
        assert.equal('trace', level);
        assert.equal(messageString, message);
        assert.deepEqual(metaObject, meta);

        done();
      };

      logger.trace(messageString, metaObject);
    });

    test('should send object in meta if not presented', (done) => {
      var logger:Logger = new Logger({});

      logger._message = (level, message, meta) => {
        assert.deepEqual({}, meta);

        done();
      };

      logger.trace('anything message');
    });

    test('should not send log if logger._levels.trace == false', (done) => {
      var logger:Logger = new Logger({});
      var sendStatus = false;

      logger._levels.trace = false;

      logger._message = () => {
        sendStatus = true;
      };

      logger.trace('anything message');

      assert.equal(false, sendStatus);

      done();
    });
  });
});
