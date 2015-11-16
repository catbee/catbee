'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var requireHelper = require('../helpers/requireHelper');
var util = require('util');
var appstate = require('appstate');
var LoaderBase = require('../base/LoaderBase');

var INFO_WATCHING_FILES = 'Watching signals for changes';
var INFO_RELOAD_FILES = 'All actions and signals reloaded';
var WARN_DUPLICATE_SIGNAL_NAME = 'Signal name %s already register... Skipping...';

var SignalLoader = (function (_LoaderBase) {
  _inherits(SignalLoader, _LoaderBase);

  /**
   * Creates new instance of the component loader.
   * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
   * @param {boolean} isRelease Release mode flag.
   * @constructor
   * @extends LoaderBase
   */

  function SignalLoader($serviceLocator, isRelease) {
    _classCallCheck(this, SignalLoader);

    _get(Object.getPrototypeOf(SignalLoader.prototype), 'constructor', this).call(this, $serviceLocator.resolveAll('signalTransform'));

    this._isRelease = false;
    this._logger = null;
    this._eventBus = null;
    this._serviceLocator = null;
    this._signalFinder = null;
    this._loadedSignals = null;
    this._serviceLocator = $serviceLocator;
    this._logger = $serviceLocator.resolve('logger');
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._signalFinder = $serviceLocator.resolve('signalFinder');
    this._isRelease = Boolean(isRelease);
  }

  /**
   * Current release flag.
   * @type {Boolean}
   * @private
   */

  _createClass(SignalLoader, [{
    key: 'load',

    /**
     * Load signals
     */
    value: function load() {
      var _this = this;

      if (this._loadedSignals) {
        return _Promise.resolve(this._loadedSignals);
      }

      var result = _Object$create(null);

      this._signalFinder.find().then(function (signalFiles) {
        return _this._parseSignalFiles(signalFiles);
      }).then(function (signalFileList) {
        signalFileList.forEach(function (signalList) {
          signalList.forEach(function (signal) {
            if (!signal || typeof signal !== 'object') {
              return;
            }

            if (signal.name in result) {
              _this._logger.warn(util.format(WARN_DUPLICATE_SIGNAL_NAME, signal.name));

              return;
            }

            result[signal.name] = signal.fn;
          });
        });

        _this._loadedSignals = result;

        if (!_this._isRelease) {
          _this._logger.info(INFO_WATCHING_FILES);
          _this._signalFinder.watch();
          _this._handleChanges();
        }

        _this._eventBus.emit('allSignalsLoaded', result);
        return _this._loadedSignals;
      });
    }

    /**
     * Return current signals hash map
     * @returns {Object}
     */
  }, {
    key: 'getSignalsByNames',
    value: function getSignalsByNames() {
      return this._loadedSignals || _Object$create(null);
    }

    /**
     * Parse signals files, and get signals definitions from it.
     * @param {Object} signalFiles
     */
  }, {
    key: '_parseSignalFiles',
    value: function _parseSignalFiles(signalFiles) {
      var _this2 = this;

      var signalPromises = _Object$keys(signalFiles).map(function (signalFileName) {
        return _this2._getSignalsFromFile(signalFiles[signalFileName]);
      });

      return _Promise.all(signalPromises);
    }

    /**
     * Require signals file, and save signals from it
     * @param {Object} signalFile
     * @private
     */
  }, {
    key: '_getSignalsFromFile',
    value: function _getSignalsFromFile(signalFile) {
      var _this3 = this;

      var file;

      try {
        file = require(requireHelper.getAbsoluteRequirePath(signalFile.path));
      } catch (e) {
        return _Promise.resolve(null);
      }

      var signalPromises = _Object$keys(file).map(function (name) {
        var actions = file[name];
        return _this3._applyTransforms(actions).then(function (transformedActions) {
          var signal = {
            name: name,
            fn: appstate.create(name, transformedActions)
          };

          _this3._eventBus.emit('signalLoaded', signal);
          return signal;
        });
      });

      return _Promise.all(signalPromises);
    }

    /**
     * Reload all signals and actions on every change
     * @private
     */
  }, {
    key: '_handleChanges',
    value: function _handleChanges() {
      var _this4 = this;

      this._signalFinder.once('reload', function () {
        _this4._logger.info(INFO_RELOAD_FILES);
        _this4._loadedSignals = null;
        _this4.load();
      });
    }
  }]);

  return SignalLoader;
})(LoaderBase);

module.exports = SignalLoader;

/**
 * Logger reference
 * @type {Logger}
 * @private
 */

/**
 * Event Bus reference
 * @type {EventEmitter}
 * @private
 */

/**
 * Current service locator
 * @type {ServiceLocator}
 * @private
 */

/**
 * Current signal finder
 * @type {SignalFinder}
 * @private
 */

/**
 * Current map of loaded signals by names.
 * @type {Object} Map of components by names.
 * @private
 */