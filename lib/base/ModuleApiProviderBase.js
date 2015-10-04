const ERROR_EVENT_NAME = 'Event name should be a string';
const ERROR_EVENT_HANDLER = 'Event handler should be a function';

class ModuleApiProviderBase {
  constructor ($serviceLocator) {
    this.locator = $serviceLocator;
    this.cookie = $serviceLocator.resolve('cookieWrapper');
    this._eventBus = $serviceLocator.resolve('eventBus');
  }

  /**
   * Current cookie provider.
   * @type {CookieWrapper}
   */
  cookie = null;

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @protected
   */
  locator = null;

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Subscribes on the specified event in Catberry.
   * @param {string} eventName Name of the event.
   * @param {Function} handler Event handler.
   * @returns {ModuleApiProviderBase} This object for chaining.
   */
  on (eventName, handler) {
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
  once (eventName, handler) {
    checkEventNameAndHandler(eventName, handler);
    this._eventBus.once(eventName, handler);
    return this;
  }

  removeListener (eventName, handler) {
    checkEventNameAndHandler(eventName, handler);
    this._eventBus.removeListener(eventName, handler);
    return this;
  }

  removeAllListeners (eventName) {
    checkEventNameAndHandler(eventName, noop);
    this._eventBus.removeAllListeners(eventName);
    return this;
  }
}

/**
 * Checks if event name is a string and handler is a function.
 * @param {*} eventName Name of the event to check.
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
function noop () {

}

module.exports = ModuleApiProviderBase;
