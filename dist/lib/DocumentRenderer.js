'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var DocumentRendererBase = require('./base/DocumentRendererBase');
var ComponentReadable = require('./streams/ComponentReadable');
var State = require('./State');

var DocumentRenderer = (function (_DocumentRendererBase) {
  _inherits(DocumentRenderer, _DocumentRendererBase);

  function DocumentRenderer($serviceLocator) {
    _classCallCheck(this, DocumentRenderer);

    _get(Object.getPrototypeOf(DocumentRenderer.prototype), 'constructor', this).call(this, $serviceLocator);
    this._eventBus = null;
    this._eventBus = $serviceLocator.resolve('eventBus');
  }

  /**
   * Event bus reference
   * @type {EventEmitter}
   * @private
   */

  _createClass(DocumentRenderer, [{
    key: 'render',

    /**
     * Render HTML Document and send it to client
     * @param {Object} urlState
     * @param {Object} routingContext
     */
    value: function render(urlState, routingContext) {
      var _this = this;

      this._getPromiseForReadyState().then(function () {
        return _this._setInitialState(urlState);
      }).then(function (state) {
        return _this._createRenderingContext(routingContext, state);
      }).then(function (renderingContext) {
        return _this._render(routingContext, renderingContext);
      })['catch'](function (reason) {
        return _this._eventBus.emit('error', reason);
      });
    }

    /**
     * Set initial application state
     * @param {Object} urlState
     * @returns {Promise}
     * @private
     */
  }, {
    key: '_setInitialState',
    value: function _setInitialState(urlState) {
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
  }, {
    key: '_createRenderingContext',
    value: function _createRenderingContext(routingContext, state) {
      return {
        state: state,
        routingContext: routingContext,
        isDocumentRendered: false,
        isHeadRendered: false,
        config: this._serviceLocator.resolve('config'),
        renderedIds: _Object$create(null),
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
  }, {
    key: '_render',
    value: function _render(routingContext, renderingContext) {
      var _this2 = this;

      var renderStream = new ComponentReadable(renderingContext);
      renderStream.renderDocument();

      renderStream.pipe(routingContext.middleware.response).on('finish', function () {
        return _this2._eventBus.emit('documentRendered', routingContext);
      });
    }
  }]);

  return DocumentRenderer;
})(DocumentRendererBase);

module.exports = DocumentRenderer;