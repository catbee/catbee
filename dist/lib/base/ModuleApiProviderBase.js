'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var ERROR_EVENT_NAME = 'Event name should be a string';
var ERROR_EVENT_HANDLER = 'Event handler should be a function';

var ModuleApiProviderBase = (function () {
  function ModuleApiProviderBase($serviceLocator) {
    _classCallCheck(this, ModuleApiProviderBase);

    this.cookie = null;
    this.locator = null;
    this._eventBus = null;

    this.locator = $serviceLocator;
    this.cookie = $serviceLocator.resolve('cookieWrapper');
    this._eventBus = $serviceLocator.resolve('eventBus');
  }

  /**
   * Checks if event name is a string and handler is a function.
   * @param {*} eventName Name of the event to check.
   * @param {*} handler The event handler to check.
   */

  /**
   * Current cookie provider.
   * @type {CookieWrapper}
   */

  _createClass(ModuleApiProviderBase, [{
    key: 'on',

    /**
     * Subscribes on the specified event in Catberry.
     * @param {string} eventName Name of the event.
     * @param {Function} handler Event handler.
     * @returns {ModuleApiProviderBase} This object for chaining.
     */
    value: function on(eventName, handler) {
      checkEventNameAndHandler(eventName, handler);
      this._eventBus.on(eventName, handler);
      return this;
    }

    /**
     * Subscribes on the specified event in Catberry to handle once.
     * @param {string} eventName Name of the event.
     * @param {Function} handler Event handler.
     * @returns {ModuleApiProviderBase} This object for chaining.
     */
  }, {
    key: 'once',
    value: function once(eventName, handler) {
      checkEventNameAndHandler(eventName, handler);
      this._eventBus.once(eventName, handler);
      return this;
    }
  }, {
    key: 'removeListener',
    value: function removeListener(eventName, handler) {
      checkEventNameAndHandler(eventName, handler);
      this._eventBus.removeListener(eventName, handler);
      return this;
    }
  }, {
    key: 'removeAllListeners',
    value: function removeAllListeners(eventName) {
      checkEventNameAndHandler(eventName, noop);
      this._eventBus.removeAllListeners(eventName);
      return this;
    }
  }]);

  return ModuleApiProviderBase;
})();

function checkEventNameAndHandler(eventName, handler) {
  if (typeof eventName !== 'string') {
    throw new Error(ERROR_EVENT_NAME);
  }

  if (typeof handler !== 'function') {
    throw new Error(ERROR_EVENT_HANDLER);
  }
}

/**
 * Does nothing. It is used as a default callback.
 */
function noop() {}

module.exports = ModuleApiProviderBase;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @protected
 */

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */