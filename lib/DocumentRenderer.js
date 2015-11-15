var DocumentRendererBase = require('./base/DocumentRendererBase');
var ComponentReadable = require('./streams/ComponentReadable');
var State = require('./State');

class DocumentRenderer extends DocumentRendererBase {
  constructor ($serviceLocator) {
    super($serviceLocator);
    this._eventBus = $serviceLocator.resolve('eventBus');
  }

  /**
   * Event bus reference
   * @type {EventEmitter}
   * @private
   */
  _eventBus = null;

  /**
   * Render HTML Document and send it to client
   * @param {Object} urlState
   * @param {Object} routingContext
   */
  render (urlState, routingContext) {
    this._getPromiseForReadyState()
      .then(() => this._setInitialState(urlState))
      .then(state => this._createRenderingContext(routingContext, state))
      .then((renderingContext) => this._render(routingContext, renderingContext))
      .catch(reason => this._eventBus.emit('error', reason));
  }

  /**
   * Set initial application state
   * @param {Object} urlState
   * @returns {Promise}
   * @private
   */
  _setInitialState (urlState) {
    var state = this._serviceLocator.resolveInstance(State);
    return state.runSignal(urlState.signal, urlState.args);
  }

  /**
   * Crete render context
   * @param {Object} routingContext
   * @param {Object} state
   * @returns {Object}
   * @protected
   */
  _createRenderingContext (routingContext, state) {
    return {
      state,
      routingContext,
      isDocumentRendered: false,
      isHeadRendered: false,
      config: this._serviceLocator.resolve('config'),
      renderedIds: Object.create(null),
      eventBus: this._eventBus,
      components: this._componentLoader.getComponentsByNames(),
      watchers: this._watcherLoader.getWatchersByNames()
    };
  }

  /**
   * Render document
   * @param {Object} routingContext
   * @param {Object} renderingContext
   * @protected
   */
  _render (routingContext, renderingContext) {
    var renderStream = new ComponentReadable(renderingContext);
    renderStream.renderDocument();

    renderStream
      .pipe(routingContext.middleware.response)
      .on('finish', () => this._eventBus.emit('documentRendered', routingContext));
  }
}

module.exports = DocumentRenderer;
