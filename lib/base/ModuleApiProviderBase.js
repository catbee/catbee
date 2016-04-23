const ERROR_EVENT_NAME = 'Event name should be a string';
const ERROR_EVENT_HANDLER = 'Event handler should be a function';

class ModuleApiProviderBase {
  constructor (locator) {
    this.locator = locator;
    this.cookie = locator.resolve('cookieWrapper');
    this._eventBus = locator.resolve('eventBus');
  }

  // Current cookie provider.
  cookie = null;

  // Current service locator.
  locator = null;

  // Current event bus.
  _eventBus = null;

  // Subscribes on the specified event in Catbee.
  on (eventName, handler) {
    checkEventNameAndHandler(eventName, handler);
    this._eventBus.on(eventName, handler);
    return this;
  }

  // Subscribes on the specified event in Catbee to handle once.
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

// Checks if event name is a string and handler is a function.
function checkEventNameAndHandler (eventName, handler) {
  if (typeof (eventName) !== 'string') {
    throw new Error(ERROR_EVENT_NAME);
  }

  if (typeof (handler) !== 'function') {
    throw new Error(ERROR_EVENT_HANDLER);
  }
}

// Does nothing. It is used as a default callback.
function noop () {

}

module.exports = ModuleApiProviderBase;
