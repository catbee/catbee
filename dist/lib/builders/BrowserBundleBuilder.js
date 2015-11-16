'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var path = require('path');
var stream = require('stream');
var util = require('util');
var fs = require('fs');
var pfs = require('../promises/fs');
var mkdirp = require('mkdirp');
var watchify = require('watchify');
var browserify = require('browserify');
var hrTimeHelper = require('../helpers/hrTimeHelper');
var UglifyTransform = require('../streams/UglifyTransform');
var packageDescriptionString = '';

var DEFAULT_PUBLIC_DIRECTORY = path.join(process.cwd(), 'public');
var TEMPORARY_BOOTSTRAPPER_FILENAME = '__BrowserBundle.js';
var BROWSER_SCRIPT_FILENAME = 'browser.js';
var BUNDLE_FILENAME = 'bundle.js';
var HEADER_FORMAT = '/*\n * %s: %s\n * Build Date: %s\n */\n\n';

var TRACE_OPTIMIZING_FILE = 'Optimizing code of file "%s"...';
var INFO_BUILDING_BUNDLE = 'Building browser script bundle...';
var INFO_WATCHING_FILES = 'Watching files for changes to rebuild bundle...';
var INFO_FILES_CHANGED = 'Bundle has been updated, changed files: [%s]';
var WARN_SKIPPING_INCORRECT_ACTION = 'The post-build action has an incorrect interface, skipping...';
var WARN_SKIPPING_INCORRECT_TRANSFORM = 'The browserify transformation has an incorrect interface, skipping...';

try {
  var packageDescription = require(path.join(process.cwd(), 'package.json'));
  if (packageDescription && packageDescription.name && packageDescription.version) {
    packageDescriptionString = util.format(HEADER_FORMAT, packageDescription.name, packageDescription.version, new Date().toString());
  }
} catch (e) {
  // ok, nothing to do here
}

var BrowserBundleBuilder = (function () {
  function BrowserBundleBuilder($serviceLocator) {
    _classCallCheck(this, BrowserBundleBuilder);

    this._serviceLocator = null;
    this._bootstrapperBuilder = null;
    this._eventBus = null;
    this._componentFinder = null;
    this._watcherFinder = null;
    this._signalFinder = null;
    this._logger = null;
    this._isRelease = false;
    this._publicPath = '';
    this._bootstrapperPath = '';
    this._entryPath = '';
    this._bundlePath = '';
    this._bundler = null;
    this._bootstrapperCache = '';
    this._postBuildActions = null;
    this._browserifyTransformations = null;

    var config = $serviceLocator.resolve('config');
    this._isRelease = Boolean(config.isRelease);
    this._serviceLocator = $serviceLocator;
    this._bootstrapperBuilder = $serviceLocator.resolve('bootstrapperBuilder');
    this._componentFinder = $serviceLocator.resolve('componentFinder');
    this._signalFinder = $serviceLocator.resolve('signalFinder');
    this._watcherFinder = $serviceLocator.resolve('watcherFinder');
    this._logger = $serviceLocator.resolve('logger');
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._publicPath = config.publicDirectoryPath || DEFAULT_PUBLIC_DIRECTORY;
    this._bootstrapperPath = path.join(process.cwd(), TEMPORARY_BOOTSTRAPPER_FILENAME);
    this._entryPath = path.join(process.cwd(), BROWSER_SCRIPT_FILENAME);
    this._bundlePath = path.join(this._publicPath, config.bundleFilename || BUNDLE_FILENAME);
    this._postBuildActions = this._serviceLocator.resolveAll('postBuildAction');
    this._browserifyTransformations = this._serviceLocator.resolveAll('browserifyTransformation');
  }

  /**
   * Creates all required directories for path.
   * @param {string} dirPath Directory path.
   * @returns {Promise} Promise for nothing.
   */

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @private
   */

  _createClass(BrowserBundleBuilder, [{
    key: 'build',

    /**
     * Builds the browser bundle.
     * @returns {Promise} Promise for nothing.
     */
    value: function build() {
      var _this = this;

      return pfs.exists(this._publicPath).then(function (isExists) {
        return !isExists ? makeDirectory(_this._publicPath) : null;
      }).then(function () {
        return _this._createBootstrapper();
      }).then(function () {
        return new _Promise(function (resolve, reject) {
          _this._createBundler().once('error', reject).once('bundle', function (bundleStream) {
            bundleStream.once('end', function () {
              return resolve();
            }).on('error', function (e) {
              return reject(e);
            });
          }).bundle();
        });
      }).then(function () {
        return _this._doPostBuildActions();
      }).then(function () {
        return _this._isRelease ? pfs.unlink(_this._bootstrapperPath) : _this._watch();
      })['catch'](function (reason) {
        return _this._eventBus.emit('error', reason);
      });
    }

    /**
     * Creates bootstrapper file for bundler.
     * @returns {Promise} Promise for nothing.
     * @private
     */
  }, {
    key: '_createBootstrapper',
    value: function _createBootstrapper() {
      var _this2 = this;

      return _Promise.all([this._componentFinder.find(), this._signalFinder.find(), this._watcherFinder.find()]).then(function (found) {
        var _bootstrapperBuilder;

        return (_bootstrapperBuilder = _this2._bootstrapperBuilder).build.apply(_bootstrapperBuilder, _toConsumableArray(found));
      }).then(function (realBootstrapper) {
        if (realBootstrapper === _this2._bootstrapperCache) {
          return;
        }
        _this2._bootstrapperCache = realBootstrapper;
        return pfs.writeFile(_this2._bootstrapperPath, realBootstrapper);
      });
    }

    /**
     * Creates browserify bundler or re-uses existed one.
     * @returns {Browserify} Browserify instance.
     * @private
     */
  }, {
    key: '_createBundler',
    value: function _createBundler() {
      var _this3 = this;

      if (this._bundler) {
        return this._bundler;
      }

      this._bundler = browserify({
        cache: {},
        packageCache: {},
        debug: !this._isRelease
      });

      this._bundler.add(this._entryPath);

      if (!this._isRelease) {
        this._bundler = watchify(this._bundler);
        this._logger.info(INFO_WATCHING_FILES);
      } else {
        this._bundler.transform(function (file) {
          if (path.extname(file) !== '.js') {
            return new stream.PassThrough();
          }
          _this3._logger.trace(util.format(TRACE_OPTIMIZING_FILE, file));
          return new UglifyTransform(_this3._serviceLocator);
        }, {
          global: true
        });
      }

      var currentIndex = this._browserifyTransformations.length - 1;
      var currentTransformation;

      while (currentIndex >= 0) {
        currentTransformation = this._browserifyTransformations[currentIndex];
        currentIndex--;
        if (!currentTransformation || typeof currentTransformation !== 'object' || typeof currentTransformation.transform !== 'function') {
          this._logger.warn(WARN_SKIPPING_INCORRECT_TRANSFORM);
          continue;
        }
        this._bundler.transform(currentTransformation.transform, currentTransformation.options);
      }

      var startTime;
      var resetHandler = function resetHandler() {
        _this3._logger.info(INFO_BUILDING_BUNDLE);
        startTime = hrTimeHelper.get();
      };

      this._bundler.on('update', function (ids) {
        _this3._logger.info(util.format(INFO_FILES_CHANGED, ids.join(',')));
        _this3._bundler.bundle();
      }).on('error', function (error) {
        _this3._logger.error(error);
        _this3._eventBus.emit('error', error);
      }).on('reset', resetHandler).on('bundle', function (sourceStream) {
        var outputStream = fs.createWriteStream(_this3._bundlePath);
        outputStream.write(packageDescriptionString);

        outputStream.once('finish', function () {
          var hrTime = hrTimeHelper.get(startTime);
          _this3._eventBus.emit('bundleBuilt', {
            path: _this3._bundlePath,
            hrTime: hrTime,
            time: hrTimeHelper.toMilliseconds(hrTime)
          });
        });
        sourceStream.pipe(outputStream);
      });

      resetHandler(); // to set startTime universally.
      return this._bundler;
    }

    /**
     * Do all registered post build actions.
     * @param {number?} index Current action index.
     * @private
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: '_doPostBuildActions',
    value: function _doPostBuildActions(index) {
      var _this4 = this;

      if (index === undefined) {
        // we start from the end because the list a stack
        index = this._postBuildActions.length - 1;
      }
      if (index < 0) {
        return _Promise.resolve();
      }

      return _Promise.resolve().then(function () {
        var actionObject = _this4._postBuildActions[index];
        if (!actionObject || typeof actionObject !== 'object' || typeof actionObject.action !== 'function') {
          _this4._logger.warn(WARN_SKIPPING_INCORRECT_ACTION);
          return;
        }

        return actionObject.action(_this4._componentFinder, _this4._watcherFinder, _this4._signalFinder);
      }).then(function () {
        return _this4._doPostBuildActions(index - 1);
      })['catch'](function (reason) {
        return _this4._eventBus.emit('error', reason);
      });
    }

    /**
     * Watches file changes.
     * @private
     */
  }, {
    key: '_watch',
    value: function _watch() {
      var watchHandler = this._createBootstrapper.bind(this);
      this._componentFinder.watch();
      this._componentFinder.on('add', watchHandler).on('unlink', watchHandler).on('changeTemplates', watchHandler);
    }
  }]);

  return BrowserBundleBuilder;
})();

function makeDirectory(dirPath) {
  return new _Promise(function (resolve, reject) {
    mkdirp(dirPath, function (error) {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

module.exports = BrowserBundleBuilder;

/**
 * Current bootstrapper builder.
 * @type {BootstrapperBuilder}
 * @private
 */

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */

/**
 * Current component finder.
 * @type {ComponentFinder}
 * @private
 */

/**
 * Current watcher finder.
 * @type {WatcherFinder}
 * @private
 */

/**
 * Current signal finder.
 * @type {SignalFinder}
 * @private
 */

/**
 * Current logger.
 * @type {Logger}
 * @private
 */

/**
 * Is current application mode release.
 * @type {boolean}
 * @private
 */

/**
 * Current path where to publish bundle.
 * @type {string}
 * @private
 */

/**
 * Current path to the __BrowserBundle.js.
 * @type {string}
 * @private
 */

/**
 * Current path to the browser.js.
 * @type {string}
 * @private
 */

/**
 * Current path to the bundle.js.
 * @type {string}
 * @private
 */

/**
 * Current Browserify bundler.
 * @type {Browserify}
 * @private
 */

/**
 * Current bootstrapper cache.
 * @type {string}
 * @private
 */

/**
 * Current post build actions list.
 * @type {Array}
 * @private
 */

/**
 * Current browserify transformations list.
 * @type {Array}
 * @private
 */