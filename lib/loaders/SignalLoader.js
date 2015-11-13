var requireHelper = require('../helpers/requireHelper');
var appstate = require('appstate');

class SignalLoader {
  constructor ($serviceLocator) {
    this._serviceLocator = $serviceLocator;
    this._signalFinder = $serviceLocator.resolve('signalFinder');
  }

  /**
   * Current service locator
   * @type {ServiceLocator}
   * @private
   */
  _serviceLocator = null;

  /**
   * Current signal finder
   * @type {SignalFinder}
   * @private
   */
  _signalFinder = null;

  /**
   * Current map of loaded signals by names.
   * @type {Object} Map of components by names.
   * @private
   */
  _loadedSignals = null;

  /**
   * Load signals
   */
  load () {
    if (this._loadedSignals) {
      return Promise.resolve(this._loadedSignals);
    }

    this._loadedSignals = Object.create(null);

    this._signalFinder.find()
      .then((signalFiles) => this._parseSignalFiles(signalFiles))
      .then(() => {
        this._signalFinder.watch();
        this._handleChanges();
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
   * Parse signals files, and get signals definitions from it.
   * @param {Object} signalFiles
   */
  _parseSignalFiles (signalFiles) {
    var signalPromises = Object.keys(signalFiles)
      .map(signalFileName => this._getSignalsFromFile(signalFiles[signalFileName]));

    return Promise.all(signalPromises);
  }

  /**
   * Require signals file, and save signals from it
   * @param {Object} signalFile
   * @private
   */
  _getSignalsFromFile (signalFile) {
    var file;

    try {
      file = require(requireHelper.getAbsoluteRequirePath(signalFile.path));
    } catch (e) {
      return Promise.resolve(null);
    }

    Object
      .keys(file)
      .forEach((name) => {
        var actions = file[name];
        var fn = appstate.create(name, actions);
        this._loadedSignals[name] = { name, fn };
      });
  }

  /**
   * Handle changes emitted by watcher
   * @private
   */
  _handleChanges () {
    this._signalFinder.once('reload', () => {
      this._loadedSignals = null;
      this.load();
    });
  }
}

module.exports = SignalLoader;
