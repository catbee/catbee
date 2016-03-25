var path = require('path');
var stream = require('stream');
var util = require('util');
var fs = require('fs');
var pfs = require('../promises/fs');
var mkdirp = require('mkdirp');
var watchify = require('watchify');
var browserify = require('browserify');
var equal = require('deep-equal');
var hrTimeHelper = require('../helpers/hrTimeHelper');
var UglifyTransform = require('../streams/UglifyTransform');
var packageDescriptionString = '';

const DEFAULT_PUBLIC_DIRECTORY = path.join(process.cwd(), 'public');
const TEMPORARY_BOOTSTRAPPER_FILENAME = '__BrowserBundle.js';
const BROWSER_SCRIPT_FILENAME = 'browser.js';
const BUNDLE_FILENAME = 'bundle.js';
const HEADER_FORMAT = '/*\n * %s: %s\n * Build Date: %s\n */\n\n';

const TRACE_OPTIMIZING_FILE = 'Optimizing code of file "%s"...';
const INFO_BUILDING_BUNDLE = 'Building browser script bundle...';
const INFO_WATCHING_FILES = 'Watching files for changes to rebuild bundle...';
const INFO_FILES_CHANGED = 'Bundle has been updated, changed files: [%s]';
const WARN_SKIPPING_INCORRECT_ACTION = 'The post-build action has an incorrect interface, skipping...';
const WARN_SKIPPING_INCORRECT_TRANSFORM = 'The browserify transformation has an incorrect interface, skipping...';
const WARN_SKIPPING_INCORRECT_PLUGIN = 'The browserify plugin has an incorrect interface, skipping...';

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
    this._signalFinder = $serviceLocator.resolve('signalFinder');
    this._watcherFinder = $serviceLocator.resolve('watcherFinder');
    this._logger = $serviceLocator.resolve('logger');
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._publicPath = config.publicDirectoryPath || DEFAULT_PUBLIC_DIRECTORY;
    this._bootstrapperPath = path.join(process.cwd(), TEMPORARY_BOOTSTRAPPER_FILENAME);
    this._entryPath = path.join(process.cwd(), BROWSER_SCRIPT_FILENAME);
    this._bundlePath = path.join(this._publicPath, (config.bundleFilename || BUNDLE_FILENAME));
    this._postBuildActions = this._serviceLocator.resolveAll('postBuildAction');
    this._browserifyTransformations = this._serviceLocator.resolveAll('browserifyTransformation');
    this._browserifyPlugins = this._serviceLocator.resolveAll('browserifyPlugin');
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
   * Current component finder.
   * @type {ComponentFinder}
   * @private
   */
  _componentFinder = null;

  /**
   * Current watcher finder.
   * @type {WatcherFinder}
   * @private
   */
  _watcherFinder = null;

  /**
   * Current signal finder.
   * @type {SignalFinder}
   * @private
   */
  _signalFinder = null;

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
   * Current browserify plugins list.
   * @type {Array}
   * @private
   */
  _browserifyPlugins = null;

  /**
   * Builds the browser bundle.
   * @returns {Promise} Promise for nothing.
   */
  build () {
    return pfs.exists(this._publicPath)
      .then(isExists => !isExists ? makeDirectory(this._publicPath) : null)
      .then(() => this._createBootstrapper())
      .then(() => {
        return new Promise((resolve, reject) => {
          this._createBundler()
            .once('error', reject)
            .once('bundle', bundleStream => {
              bundleStream
                .once('end', () => resolve())
                .on('error', e => {
                  delete e.stream;
                  reject(e);
                });
            })
            .bundle();
        });
      })
      .then(() => this._doPostBuildActions())
      .then(() => this._isRelease ? pfs.unlink(this._bootstrapperPath) : this._watch())
      .catch(reason => this._eventBus.emit('error', reason));
  }

  /**
   * Creates bootstrapper file for bundler.
   * @param {Boolean} forceRebuild force rebuild if equal caches
   * @returns {Promise} Promise for nothing.
   * @private
   */
  _createBootstrapper (forceRebuild) {
    return Promise.all([
      this._componentFinder.find(),
      this._signalFinder.find(),
      this._watcherFinder.find()
    ])
    .then(found => {
      if (this._bootstrapperCache && equal(found, this._bootstrapperCache) && !forceRebuild) {
        return Promise.resolve();
      }

      this._bootstrapperCache = found;
      return this._bootstrapperBuilder.build(...found);
    })
    .then(realBootstrapper => {
      if (!realBootstrapper) {
        return Promise.resolve();
      }

      return pfs.writeFile(this._bootstrapperPath, realBootstrapper);
    });
  }

  /**
   * Creates browserify bundler or re-uses existed one.
   * @returns {Browserify} Browserify instance.
   * @private
   */
  _createBundler () {
    var currentTransformation, currentPlugin, startTime;

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
      this._bundler.transform(file => {
        if (path.extname(file) !== '.js') {
          return new stream.PassThrough();
        }
        this._logger.trace(util.format(
          TRACE_OPTIMIZING_FILE, file
        ));
        return new UglifyTransform(this._serviceLocator);
      }, {
        global: true
      });
    }

    var currentTransformIndex = this._browserifyTransformations.length - 1;

    while (currentTransformIndex >= 0) {
      currentTransformation = this._browserifyTransformations[currentTransformIndex];
      currentTransformIndex--;
      if (!currentTransformation ||
        typeof (currentTransformation) !== 'object' ||
        typeof (currentTransformation.transform) !== 'function') {
        this._logger.warn(WARN_SKIPPING_INCORRECT_TRANSFORM);
        continue;
      }
      this._bundler.transform(currentTransformation.transform, currentTransformation.options);
    }

    var currentPluginIndex = this._browserifyPlugins.length - 1;

    while (currentPluginIndex >= 0) {
      currentPlugin = this._browserifyPlugins[currentPluginIndex];
      currentPluginIndex--;
      if (!currentPlugin ||
        typeof (currentPlugin) !== 'object' ||
        typeof (currentPlugin.plugin) !== 'function') {
        this._logger.warn(WARN_SKIPPING_INCORRECT_PLUGIN);
        continue;
      }
      this._bundler.plugin(currentPlugin.plugin, currentPlugin.options);
    }

    var resetHandler = () => {
      this._logger.info(INFO_BUILDING_BUNDLE);
      startTime = hrTimeHelper.get();
    };

    this._bundler
      .on('update', ids => {
        this._logger.info(util.format(
          INFO_FILES_CHANGED,
          ids.join(',')
        ));
        this._bundler.bundle();
      })
      .on('error', error => {
        this._logger.error(error);
        this._eventBus.emit('error', error);
      })
      .on('reset', resetHandler)
      .on('bundle', sourceStream => {
        var outputStream = fs.createWriteStream(this._bundlePath);
        outputStream.write(packageDescriptionString);

        outputStream.once('finish', () => {
          var hrTime = hrTimeHelper.get(startTime);
          this._eventBus.emit('bundleBuilt', {
            path: this._bundlePath,
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
  _doPostBuildActions (index) {
    if (index === undefined) {
      // we start from the end because the list a stack
      index = this._postBuildActions.length - 1;
    }
    if (index < 0) {
      return Promise.resolve();
    }

    return Promise.resolve()
      .then(() => {
        var actionObject = this._postBuildActions[index];
        if (!actionObject ||
          typeof (actionObject) !== 'object' ||
          typeof (actionObject.action) !== 'function') {
          this._logger.warn(WARN_SKIPPING_INCORRECT_ACTION);
          return Promise.resolve();
        }

        return actionObject.action(this._componentFinder, this._watcherFinder, this._signalFinder);
      })
      .then(() => this._doPostBuildActions(index - 1))
      .catch(reason => this._eventBus.emit('error', reason));
  }

  /**
   * Watches file changes.
   * @private
   */
  _watch () {
    var watchHandler = this._createBootstrapper.bind(this);
    this._componentFinder.watch();
    this._signalFinder.watch();
    this._watcherFinder.watch();

    this._signalFinder
      .on('reload', watchHandler);

    this._watcherFinder
      .on('add', watchHandler)
      .on('unlink', watchHandler);

    this._componentFinder
      .on('add', watchHandler)
      .on('unlink', watchHandler)
      .on('changeTemplates', watchHandler.bind(this, true));
  }
}

/**
 * Creates all required directories for path.
 * @param {string} dirPath Directory path.
 * @returns {Promise} Promise for nothing.
 */
function makeDirectory (dirPath) {
  return new Promise((resolve, reject) => {
    mkdirp(dirPath, error => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

module.exports = BrowserBundleBuilder;
