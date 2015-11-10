class DocumentRendererBase {
  constructor ($serviceLocator) {
    this._serviceLocator = $serviceLocator;
    this._contextFactory = $serviceLocator.resolve('contextFactory');
    this._componentLoader = $serviceLocator.resolve('componentLoader');
    this._signalLoader = $serviceLocator.resolve('signalLoader');
    this._watcherLoader = $serviceLocator.resolve('watcherLoader');
    this._eventBus = $serviceLocator.resolve('eventBus');

    this._loading = Promise.all([
      this._componentLoader.load(),
      this._signalLoader.load(),
      this._watcherLoader.load()
    ])
    .then(() => {
      this._loading = null;
      this._eventBus.emit('ready');
    })
    .catch(reason => this._eventBus.emit('error', reason));
  }

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @protected
   */
  _serviceLocator = null;

  /**
   * Current component loader.
   * @type {ComponentLoader}
   * @protected
   */
  _componentLoader = null;

  /**
   * Current signal loader.
   * @type {ComponentLoader}
   * @protected
   */
  _signalLoader = null;

  /**
   * Current module loading promise.
   * @type {Promise}
   * @protected
   */
  _loading = null;

  /**
   * Current context factory.
   * @type {ContextFactory}
   * @protected
   */
  _contextFactory = null;

  /**
   * Gets promise for ready state when it will be able handle requests.
   * @returns {Promise} Promise for nothing.
   * @protected
   */
  _getPromiseForReadyState () {
    return this._loading ? this._loading : Promise.resolve();
  }
}

module.exports = DocumentRendererBase;
