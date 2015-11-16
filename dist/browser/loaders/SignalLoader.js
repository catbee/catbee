'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var appstate = require('appstate');
var LoaderBase = require('../../lib/base/LoaderBase');
var util = require('util');

var WARN_DUPLICATE_SIGNAL_NAME = 'Signal name %s already register... Skipping...';

var SignalLoader = (function (_LoaderBase) {
  _inherits(SignalLoader, _LoaderBase);

  function SignalLoader($serviceLocator) {
    _classCallCheck(this, SignalLoader);

    _get(Object.getPrototypeOf(SignalLoader.prototype), 'constructor', this).call(this, $serviceLocator.resolveAll('signalTransform'));

    this._eventBus = null;
    this._serviceLocator = null;
    this._loadedSignals = null;
    this._serviceLocator = $serviceLocator;
    this._eventBus = $serviceLocator.resolve('eventBus');
  }

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */

  _createClass(SignalLoader, [{
    key: 'load',

    /**
     * Loads components when it is in a browser.
     * @returns {Promise} Promise for nothing.
     */
    value: function load() {
      var _this = this;

      if (this._loadedSignals) {
        return _Promise.resolve(this._loadedSignals);
      }

      var result = _Object$create(null);

      return _Promise.resolve().then(function () {
        var signalsFiles = _this._serviceLocator.resolveAll('signal');

        signalsFiles.forEach(function (file) {
          _this._getSignalsFromFile(file.definition).then(function (signals) {
            signals.forEach(function (signal) {
              if (!signal || typeof signal !== 'object') {
                return;
              }

              if (signal.name in result) {
                _this._logger.warn(util.format(WARN_DUPLICATE_SIGNAL_NAME, signal.name));

                return;
              }

              result[signal.name] = signal.fn;
            });

            _this._loadedSignals = result;
            _this._eventBus.emit('allSignalsLoaded', result);
            return _this._loadedSignals;
          });
        });
      });
    }

    /**
     * Get signals file from memory, and save signals from it
     * @param {Object} file
     * @private
     */
  }, {
    key: '_getSignalsFromFile',
    value: function _getSignalsFromFile(file) {
      var _this2 = this;

      var signalPromises = _Object$keys(file).map(function (name) {
        var actions = file[name];
        return _this2._applyTransforms(actions).then(function (transformedActions) {
          var signal = {
            name: name,
            fn: appstate.create(name, transformedActions)
          };

          _this2._eventBus.emit('signalLoaded', signal);
          return signal;
        });
      });

      return _Promise.all(signalPromises);
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
  }]);

  return SignalLoader;
})(LoaderBase);

module.exports = SignalLoader;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */

/**
 * Current map of loaded components by names.
 * @type {Object} Map of components by names.
 * @private
 */