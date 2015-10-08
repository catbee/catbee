var DocumentRendererBase = require('./base/DocumentRendererBase');
var ComponentReadable = require('./streams/ComponentReadable');

class DocumentRenderer extends DocumentRendererBase {
  constructor ($serviceLocator) {
    super($serviceLocator);
  }

  render (state, routingContext) {
    var self = this;
    this._getPromiseForReadyState()
      .then(() => {
        var renderingContext = {
          isDocumentRendered: false,
          isHeadRendered: false,
          config: self._serviceLocator.resolve('config'),
          renderedIds: Object.create(null),
          routingContext: routingContext,
          storeDispatcher: self._serviceLocator
            .resolve('storeDispatcher'),
          logger: self._serviceLocator
            .resolve('logger'),
          eventBus: self._eventBus,
          components: self._componentLoader.getComponentsByNames()
        };
        renderingContext.storeDispatcher.setState(state, routingContext);

        var renderStream = new ComponentReadable(renderingContext);

        renderStream.renderDocument();
        renderStream
          .pipe(routingContext.middleware.response)
          .on('finish', () => {
            self._eventBus.emit('documentRendered', routingContext);
          });
      })
      .catch((reason) => {
        self._eventBus.emit('error', reason);
      });
  }
}

module.exports = DocumentRenderer;
