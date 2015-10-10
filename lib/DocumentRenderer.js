var DocumentRendererBase = require('./base/DocumentRendererBase');
var ComponentReadable = require('./streams/ComponentReadable');
var State = require('./State');

class DocumentRenderer extends DocumentRendererBase {
  constructor ($serviceLocator) {
    super($serviceLocator);
  }

  /**
   * Render HTML Document and send it to client
   * @param {Object} URLState
   * @param {Object} routingContext
   */
  render (URLState, routingContext) {
    this._getPromiseForReadyState()
      .then(this._setInitialState.bind(this, routingContext, URLState))
      .then(this._createRenderingContext.bind(this, routingContext))
      .then(this._render.bind(this, routingContext))
      .catch((reason) => this._eventBus.emit('error', reason));
  }

  /**
   * Set initial application state
   * @param {Object} routingContext
   * @param {Object} URLState
   * @returns {State}
   * @private
   */
  _setInitialState (routingContext, URLState) {
    var state = this._serviceLocator.resolveInstance(State);
    return state.setInitialState(routingContext, URLState);
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
      state, routingContext,
      isDocumentRendered: false,
      isHeadRendered: false,
      config: this._serviceLocator.resolve('config'),
      renderedIds: Object.create(null),
      eventBus: this._eventBus,
      components: this._componentLoader.getComponentsByNames()
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
