var Baobab = require('baobab');

const ERROR_NAME_NOT_PROVIDED = 'Signal name is required argument for runSignal method';
const ERROR_SIGNAL_NOT_FOUND = 'Signal not found in current signal set';

class State {
  /**
   * Main class for control application state.
   * Use Baobab as main state storage and expose interface for state modification.
   * @constructor
   * @param {ServiceLocator} $serviceLocator
   */
  constructor ($serviceLocator) {
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
  _locator = null;

  /**
   * Current event bus
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Signal Loader reference
   * @type {SignalLoader}
   * @private
   */
  _signalLoader = null;

  /**
   * Baobab tree reference
   * @type {Baobab}
   */
  _tree = null;

  /**
   * Current routing context
   * @type {Object}
   * @private
   */
  _routingContext = null;

  /**
   * Find and run signal, after signal is resolved,
   * all result will pushed to history stack.
   * @param {String} name
   * @param {Object} [args={}]
   * @return {Promise}
   */
  runSignal (name, args = {}) {
    return new Promise((resolve, reject) => {
      if (!name) {
        return reject(ERROR_NAME_NOT_PROVIDED);
      }

      var signals = this._signalLoader.getSignalsByNames();
      var signal = signals[name];
      var services = this._createServices();

      if (!signal) {
        return reject(ERROR_SIGNAL_NOT_FOUND);
      }

      signal.apply(null, [this._tree, services, args])
        .then(result => {
          resolve();
          this._eventBus.emit('signalEnd', result);
        })
        .catch(reason => reject(reason));
    });
  }

  /**
   * Set current routing context
   * @param {Object} context
   */
  setRoutingContext (context) {
    this._routingContext = context;
  }

  /**
   * Get watcher from tree
   * @param {Object} definition
   * @return {Object}
   */
  getWatcher (definition) {
    return this._tree.watch(definition);
  }

  /**
   * Create services that will be passed to all signals
   * @returns {{locator: ServiceLocator}}
   * @private
   */
  _createServices () {
    return {
      locator: this._locator,
      context: this._routingContext
    };
  }
}

module.exports = State;
