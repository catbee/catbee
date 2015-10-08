class DocumentRendererBase {
  constructor ($serviceLocator) {
    this._serviceLocator = $serviceLocator;
    this._contextFactory = $serviceLocator.resolve('contextFactory');
    this._componentLoader = $serviceLocator.resolve('componentLoader');
    this._eventBus = $serviceLocator.resolve('eventBus');
    this._storeLoader = $serviceLocator.resolve('storeLoader');

    this._loading = Promise.all([
      this._componentLoader.load(),
      this._storeLoader.load()
    ])
    .then(() => {
      self._loading = null;
      self._eventBus.emit('ready');
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
   * Current component loader.
   * @type {ComponentLoader}
   * @protected
   */
  _storeLoader = null;

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
    return this._loading ?
      this._loading :
      Promise.resolve();
  }
}

module.exports = DocumentRendererBase;
