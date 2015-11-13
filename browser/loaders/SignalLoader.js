var appstate = require('appstate');

class SignalLoader {
  constructor ($serviceLocator) {
    this._serviceLocator = $serviceLocator;
    this._eventBus = $serviceLocator.resolve('eventBus');
  }

  /**
   * Current event bus.
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @private
   */
  _serviceLocator = null;

  /**
   * Current map of loaded components by names.
   * @type {Object} Map of components by names.
   * @private
   */
  _loadedSignals = null;

  /**
   * Loads components when it is in a browser.
   * @returns {Promise} Promise for nothing.
   */
  load () {
    if (this._loadedSignals) {
      return Promise.resolve(this._loadedSignals);
    }

    this._loadedSignals = Object.create(null);

    return Promise.resolve()
      .then(() => {
        var signalsFiles = this._serviceLocator.resolveAll('signal');
        var signals = [];

        signalsFiles.forEach(file => {
          var fileDefinition = file.definition;
          Object.keys(fileDefinition)
            .forEach(signalKey => {
              var definition = fileDefinition[signalKey];
              signals.push({
                name: signalKey,
                definition: definition
              });
            });
        });

        return signals;
      })
      .then(signals => {
        var signalPromises = [];
        signals.forEach(signal => signalPromises.unshift(this._processSignal(signal)));
        return Promise.all(signalPromises);
      })
      .then(signals => {
        signals.forEach(signal => {
          if (!signal || typeof (signal) !== 'object') {
            return;
          }
          this._loadedSignals[signal.name] = signal;
        });

        this._eventBus.emit('allSignalsLoaded', signals);
        return this._loadedSignals;
      });
  }

  /**
   * Return current signals hash map
   * @returns {Object}
   */
  getSignalsByNames () {
    return this._loadedSignals || Object.create(null);
  }

  /**
   * Processes component and apply required operations.
   * @param {Object} signalDetails Loaded component details.
   * @returns {Object} Component object.
   * @private
   */
  _processSignal ({ name, definition }) {
    var fn = appstate.create(name, definition);
    this._eventBus.emit('signalLoaded', { name });

    return {
      name, fn
    }
  }
}

module.exports = SignalLoader;
