'use strict';

const ERROR_EVENT_NAME = 'Event name should be a string';
const ERROR_EVENT_HANDLER = 'Event handler should be a function';

/**
 * Implements the basic Module API Provider class for both server
 * and browser environments.
 */
class ModuleApiProviderBase {
  /**
   * Creates a new instance of the basic API provider.
   * @param {ServiceLocator} locator Service locator for resolving dependencies.
   */
  constructor (locator) {
    /**
     * Current service locator.
     * @type {ServiceLocator}
     */
    this.locator = locator;

    /**
     * Current cookie provider.
     * @type {CookieWrapper}
     */
    this.cookie = locator.resolve('cookieWrapper');

    /**
     * Current event bus.
     * @type {EventEmitter}
     * @private
     */
    this._eventBus = locator.resolve('eventBus');
  }

  /**
   * Subscribes on the specified event in Catbee.
   * @param {string} eventName The name of the event.
   * @param {Function} handler The event handler.
   * @returns {ModuleApiProviderBase} This object for chaining.
   */
  on (eventName, handler) {
    checkEventNameAndHandler(eventName, handler);
    this._eventBus.on(eventName, handler);
    return this;
  }

  /**
   * Subscribes on the specified event in Catberry to handle it once.
   * @param {string} eventName The name of the event.
   * @param {Function} handler The event handler.
   * @returns {ModuleApiProviderBase} This object for chaining.
   */
  once (eventName, handler) {
    checkEventNameAndHandler(eventName, handler);
    this._eventBus.once(eventName, handler);
    return this;
  }

  /**
   * Removes the specified handler from the specified event.
   * @param {string} eventName The name of the event.
   * @param {Function} handler The event handler.
   * @returns {ModuleApiProviderBase} This object for chaining.
   */
  removeListener (eventName, handler) {
    checkEventNameAndHandler(eventName, handler);
    this._eventBus.removeListener(eventName, handler);
    return this;
  }

  /**
   * Removes all handlers from the specified event in Catberry.
   * @param {string} eventName The name of the event.
   * @returns {ModuleApiProviderBase} This object for chaining.
   */
  removeAllListeners (eventName) {
    checkEventNameAndHandler(eventName, noop);
    this._eventBus.removeAllListeners(eventName);
    return this;
  }
}

/**
 * Checks if an event name is a string and handler is a function.
 * @param {*} eventName The name of the event to check.
 * @param {*} handler The event handler to check.
 */
function checkEventNameAndHandler (eventName, handler) {
  if (typeof (eventName) !== 'string') {
    throw new Error(ERROR_EVENT_NAME);
  }

  if (typeof (handler) !== 'function') {
    throw new Error(ERROR_EVENT_HANDLER);
  }
}

/**
 * Does nothing. It is used as a default callback.
 */
function noop () {}

module.exports = ModuleApiProviderBase;
