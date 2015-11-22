var appstate = require('appstate');
var LoaderBase = require('../../lib/base/LoaderBase');
var util = require('util');

const WARN_DUPLICATE_SIGNAL_NAME = 'Signal name %s already register... Skipping...';

class SignalLoader extends LoaderBase {
  constructor ($serviceLocator) {
    super($serviceLocator.resolveAll('signalTransform'));

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

    var result = Object.create(null);

    return Promise.resolve()
      .then(() => {
        var signalsFiles = this._serviceLocator.resolveAll('signal');

        var promises = signalsFiles.map(file => {
          return this._getSignalsFromFile(file.definition)
            .then(signals => {
              signals.forEach(signal => {
                if (!signal || typeof (signal) !== 'object') {
                  return;
                }

                if (signal.name in result) {
                  this._logger.warn(util.format(WARN_DUPLICATE_SIGNAL_NAME, signal.name));
                  return;
                }

                result[signal.name] = signal.fn;
              });

              this._loadedSignals = result;
              return this._loadedSignals;
            });
        });

        return Promise.all(promises)
          .then(() => this._eventBus.emit('allSignalsLoaded', this._loadedSignals));
      });
  }

  /**
   * Get signals file from memory, and save signals from it
   * @param {Object} file
   * @private
   */
  _getSignalsFromFile (file) {
    var signalPromises = Object.keys(file)
      .map((name) => {
        var actions = file[name];
        return this._applyTransforms(actions)
          .then((transformedActions) => {
            try {
              var fn = appstate.create(name, transformedActions);
              var signal = { name, fn };

              this._eventBus.emit('signalLoaded', signal);
              return signal;
            } catch (e) {
              this._eventBus.emit('error', e);
            }
          });
      });

    return Promise.all(signalPromises);
  }

  /**
   * Return current signals hash map
   * @returns {Object}
   */
  getSignalsByNames () {
    return this._loadedSignals || Object.create(null);
  }
}

module.exports = SignalLoader;
