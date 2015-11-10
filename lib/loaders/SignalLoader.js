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
   * Is signal already loaded flag
   * @type {Boolean}
   * @private
   */
  _isLoad = false;

  /**
   * Load signals
   */
  load () {
    if (this._isLoad) {
      return Promise.resolve();
    }

    this._signalFinder.find()
      .then((signalFiles) => this._parseSignalFiles(signalFiles))
      .then(() => {
        this._isLoad = true;
      })
      .then(() => {
        this._signalFinder.watch();
        this._handleChanges();
      });
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

        this._serviceLocator.registerInstance('signal', { fn, name });
      });
  }

  /**
   * Handle changes emitted by watcher
   * @private
   */
  _handleChanges () {
    this._signalFinder.once('reload', () => {
      this._serviceLocator.unregister('signal');
      this._isLoad = false;
      this.load();
    });
  }
}

module.exports = SignalLoader;
