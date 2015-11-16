'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var DocumentRendererBase = (function () {
  function DocumentRendererBase($serviceLocator) {
    var _this = this;

    _classCallCheck(this, DocumentRendererBase);

    this._serviceLocator = null;
    this._componentLoader = null;
    this._signalLoader = null;
    this._loading = null;
    this._contextFactory = null;

    this._serviceLocator = $serviceLocator;
    this._contextFactory = $serviceLocator.resolve('contextFactory');
    this._componentLoader = $serviceLocator.resolve('componentLoader');
    this._signalLoader = $serviceLocator.resolve('signalLoader');
    this._watcherLoader = $serviceLocator.resolve('watcherLoader');
    this._eventBus = $serviceLocator.resolve('eventBus');

    this._loading = _Promise.all([this._componentLoader.load(), this._signalLoader.load(), this._watcherLoader.load()]).then(function () {
      _this._loading = null;
      _this._eventBus.emit('ready');
    })['catch'](function (reason) {
      return _this._eventBus.emit('error', reason);
    });
  }

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @protected
   */

  _createClass(DocumentRendererBase, [{
    key: '_getPromiseForReadyState',

    /**
     * Gets promise for ready state when it will be able handle requests.
     * @returns {Promise} Promise for nothing.
     * @protected
     */
    value: function _getPromiseForReadyState() {
      return this._loading ? this._loading : _Promise.resolve();
    }
  }]);

  return DocumentRendererBase;
})();

module.exports = DocumentRendererBase;

/**
 * Current component loader.
 * @type {ComponentLoader}
 * @protected
 */

/**
 * Current signal loader.
 * @type {ComponentLoader}
 * @protected
 */

/**
 * Current module loading promise.
 * @type {Promise}
 * @protected
 */

/**
 * Current context factory.
 * @type {ContextFactory}
 * @protected
 */