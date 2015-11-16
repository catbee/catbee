'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var Baobab = require('baobab');

var State = (function () {
  /**
   * Main class for control application state.
   * Use Baobab as main state storage and expose interface for state modification.
   * @constructor
   * @param {ServiceLocator} $serviceLocator
   */

  function State($serviceLocator) {
    _classCallCheck(this, State);

    this._locator = null;
    this._eventBus = null;
    this._signalLoader = null;
    this._tree = null;

    this._tree = new Baobab();
    this._locator = $serviceLocator;
    this._signalLoader = $serviceLocator.resolve('signalLoader');
    this._eventBus = $serviceLocator.resolve('eventBus');

    this.runSignal = this.runSignal.bind(this);
  }

  /**
   * Service locator reference
   * @type {ServiceLocator}
   * @private
   */

  _createClass(State, [{
    key: 'runSignal',

    /**
     * Find and run signal, after signal is resolved,
     * all result will pushed to history stack.
     * @param {String} name
     * @param {Object} [args={}]
     * @return {Promise}
     */
    value: function runSignal(name) {
      var _this = this;

      var args = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (!name) {
        return _Promise.resolve();
      }

      var signals = this._signalLoader.getSignalsByNames();
      var signal = signals[name];

      if (!signal) {
        return _Promise.resolve();
      }

      return signal.apply(null, [this._tree, args]).then(function (result) {
        return _this._eventBus.emit('signalEnd', result);
      }).then(function () {
        return _this;
      })['catch'](function (reason) {
        return _this._eventBus.emit('error', reason);
      });
    }

    /**
     * Get watcher from tree
     * @param {Object} definition
     * @return {Object}
     */
  }, {
    key: 'getWatcher',
    value: function getWatcher(definition) {
      return this._tree.watch(definition);
    }
  }]);

  return State;
})();

module.exports = State;

/**
 * Current event bus
 * @type {EventEmitter}
 * @private
 */

/**
 * Signal Loader reference
 * @type {SignalLoader}
 * @private
 */

/**
 * Baobab tree reference
 * @type {Baobab}
 */