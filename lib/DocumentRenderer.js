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
    var state;

    this._getPromiseForReadyState()
      .then(() => {
        state = this._serviceLocator.resolveInstance(State);
        return state.runSignal(urlState.signal, urlState.args);
      })
      .then(() => {
        var renderingContext = {
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

        var renderStream = new ComponentReadable(renderingContext);
        renderStream.renderDocument();

        renderStream
          .pipe(routingContext.middleware.response)
          .on('finish', () => this._eventBus.emit('documentRendered', routingContext));
      })
      .catch(reason => this._eventBus.emit('error', reason));
  }
}

module.exports = DocumentRenderer;
