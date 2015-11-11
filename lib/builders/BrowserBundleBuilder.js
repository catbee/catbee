var path = require('path');
var stream = require('stream');
var util = require('util');
var fs = require('fs');
var pfs = require('../promises/fs');
var watchify = require('watchify');
var browserify = require('browserify');
var hrTimeHelper = require('../helpers/hrTimeHelper');
var moduleHelper = require('../helpers/moduleHelper');
var UglifyTransform = require('../streams/UglifyTransform');
var packageDescriptionString = '';

const DEFAULT_PUBLIC_DIRECTORY = path.join(process.cwd(), 'public');
const TEMPORARY_BOOTSTRAPPER_FILENAME = '__BrowserBundle.js';
const BROWSER_SCRIPT_FILENAME = 'browser.js';
const BUNDLE_FILENAME = 'bundle.js';
const HEADER_FORMAT = '/*\n * %s: %s\n * Build Date: %s\n */\n\n';

try {
  var packageDescription = require(path.join(process.cwd(), 'package.json'));
  if (packageDescription &&
    packageDescription.name &&
    packageDescription.version) {
    packageDescriptionString =
      util.format(
        HEADER_FORMAT,
        packageDescription.name,
        packageDescription.version,
        (new Date()).toString()
      );
  }
} catch (e) {
  // ok, nothing to do here
}

class BrowserBundleBuilder {
  constructor ($serviceLocator) {
    var config = $serviceLocator.resolve('config');
    this._isRelease = Boolean(config.isRelease);

    this._serviceLocator = $serviceLocator;
    this._bootstrapperBuilder = $serviceLocator.resolve('bootstrapperBuilder');
    this._componentFinder = $serviceLocator.resolve('componentFinder');
    this._storeFinder = $serviceLocator.resolve('storeFinder');

    this._publicPath = config.publicDirectoryPath || DEFAULT_PUBLIC_DIRECTORY;
    this._bootstrapperPath = path.join(process.cwd(), TEMPORARY_BOOTSTRAPPER_FILENAME);
    this._entryPath = path.join(process.cwd(), BROWSER_SCRIPT_FILENAME);
    this._bundlePath = path.join(this._publicPath, (config.bundleFilename || BUNDLE_FILENAME));
    this._postBuildActions = this._serviceLocator.resolveAll('postBuildAction');
    this._browserifyTransformations = this._serviceLocator.resolveAll('browserifyTransformation');
  }

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @private
   */
  _serviceLocator = null;

  /**
   * Current bootstrapper builder.
   * @type {BootstrapperBuilder}
   * @private
   */
  _bootstrapperBuilder = null;

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Current store finder.
   * @type {StoreFinder}
   * @private
   */
  _storeFinder = null;

  /**
   * Current component finder.
   * @type {ComponentFinder}
   * @private
   */
  _componentFinder = null;

  /**
   * Current logger.
   * @type {Logger}
   * @private
   */
  _logger = null;

  /**
   * Is current application mode release.
   * @type {boolean}
   * @private
   */
  _isRelease = false;

  /**
   * Current path where to publish bundle.
   * @type {string}
   * @private
   */
  _publicPath = '';

  /**
   * Current path to the __BrowserBundle.js.
   * @type {string}
   * @private
   */
  _bootstrapperPath = '';

  /**
   * Current path to the browser.js.
   * @type {string}
   * @private
   */
  _entryPath = '';

  /**
   * Current path to the bundle.js.
   * @type {string}
   * @private
   */
  _bundlePath = '';

  /**
   * Current Browserify bundler.
   * @type {Browserify}
   * @private
   */
  _bundler = null;

  /**
   * Current bootstrapper cache.
   * @type {string}
   * @private
   */
  _bootstrapperCache = '';

  /**
   * Current post build actions list.
   * @type {Array}
   * @private
   */
  _postBuildActions = null;

  /**
   * Current browserify transformations list.
   * @type {Array}
   * @private
   */
  _browserifyTransformations = null;

  /**
   * Builds the browser bundle.
   * @returns {Promise} Promise for nothing.
   */
  build () {
    var self = this;

    return pfs.exists(this._publicPath)
      .then(function (isExists) {
        return !isExists ? makeDirectory(self._publicPath) : null;
      })
      .then(function () {
        return self._createBootstrapper();
      })
      .then(function () {
        return new Promise(function (fulfill, reject) {
          self._createBundler()
            .once('error', reject)
            .once('bundle', function (bundleStream) {
              bundleStream
                .once('end', fulfill)
                .on('error', reject);
            })
            .bundle();
        });
      })
      .then(function () {
        return self._doPostBuildActions();
      })
      .then(function () {
        return self._isRelease ?
          pfs.unlink(self._bootstrapperPath) :
          self._watch();
      })
      .catch(function (reason) {
        self._eventBus.emit('error', reason);
      });
  };

  /**
   * Creates bootstrapper file for bundler.
   * @returns {Promise} Promise for nothing.
   * @private
   */
  _createBootstrapper  () {
    var self = this;
    return Promise.all([
        this._storeFinder.find(),
        this._componentFinder.find()
      ])
      .then(function (found) {
        return self._bootstrapperBuilder.build(found[0], found[1]);
      })
      .then(function (realBootstrapper) {
        if (realBootstrapper === self._bootstrapperCache) {
          return;
        }
        self._bootstrapperCache = realBootstrapper;
        return pfs.writeFile(self._bootstrapperPath, realBootstrapper);
      });
  };

  /**
   * Creates browserify bundler or re-uses existed one.
   * @returns {Browserify} Browserify instance.
   * @private
   */
  _createBundler () {
    if (this._bundler) {
      return this._bundler;
    }
    var self = this;

    this._bundler = browserify({
      cache: {},
      packageCache: {},
      debug: !this._isRelease
    });

    this._bundler.add(this._entryPath);

    if (!self._isRelease) {
      this._bundler = watchify(this._bundler);
      this._logger.info(INFO_WATCHING_FILES);
    } else {
      this._bundler.transform(function (file) {
        if (path.extname(file) !== '.js') {
          return new stream.PassThrough();
        }
        self._logger.trace(util.format(
          TRACE_OPTIMIZING_FILE, file
        ));
        return new UglifyTransform(self._serviceLocator);
      }, {
        global: true
      });
    }

    var currentIndex = this._browserifyTransformations.length - 1,
      currentTransformation;
    while (currentIndex >= 0) {
      currentTransformation = this._browserifyTransformations[currentIndex];
      currentIndex--;
      if (!currentTransformation ||
        typeof (currentTransformation) !== 'object' ||
        typeof (currentTransformation.transform) !== 'function') {
        this._logger.warn(WARN_SKIPPING_INCORRECT_TRANSFORM);
        continue;
      }
      this._bundler.transform(
        currentTransformation.transform, currentTransformation.options
      );
    }

    var startTime,
      resetHandler = function () {
        self._logger.info(INFO_BUILDING_BUNDLE);
        startTime = hrTimeHelper.get();
      };

    this._bundler
      .on('update', function (ids) {
        self._logger.info(util.format(
          INFO_FILES_CHANGED,
          ids.join(',')
        ));
        self._bundler.bundle();
      })
      .on('error', function (error) {
        self._eventBus.emit('error', error);
      })
      .on('reset', resetHandler)
      .on('bundle', function (sourceStream) {
        var outputStream = fs.createWriteStream(self._bundlePath);
        outputStream.write(packageDescriptionString);
        outputStream.once('finish', function () {
          var hrTime = hrTimeHelper.get(startTime);
          self._eventBus.emit('bundleBuilt', {
            path: self._bundlePath,
            hrTime: hrTime,
            time: hrTimeHelper.toMilliseconds(hrTime)
          });
        });
        sourceStream.pipe(outputStream);
      });

    resetHandler(); // to set startTime universally.
    return this._bundler;
  };

  /**
   * Do all registered post build actions.
   * @param {number?} index Current action index.
   * @private
   * @returns {Promise} Promise for nothing.
   */
  _doPostBuildActions (index) {
    if (index === undefined) {
      // we start from the end because the list a stack
      index = this._postBuildActions.length - 1;
    }
    if (index < 0) {
      return Promise.resolve();
    }

    var self = this;
    return Promise.resolve()
      .then(function () {
        var actionObject = self._postBuildActions[index];
        if (!actionObject ||
          typeof (actionObject) !== 'object' ||
          typeof (actionObject.action) !== 'function') {
          self._logger.warn(WARN_SKIPPING_INCORRECT_ACTION);
          return;
        }

        return actionObject.action(
          self._storeFinder, self._componentFinder
        );
      })
      .catch(function (reason) {
        self._eventBus.emit('error', reason);
      })
      .then(function () {
        return self._doPostBuildActions(index - 1);
      });
  };

  /**
   * Watches file changes.
   * @private
   */
  _watch () {
    var watchHandler = this._createBootstrapper.bind(this);
    this._componentFinder.watch();
    this._componentFinder
      .on('add', watchHandler)
      .on('unlink', watchHandler)
      .on('changeTemplates', watchHandler);

    this._storeFinder.watch();
    this._storeFinder
      .on('add', watchHandler)
      .on('unlink', watchHandler);
  }
}

module.exports = BrowserBundleBuilder;
