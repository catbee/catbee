'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var catberryURI = require('catberry-uri');
var URI = catberryURI.URI;
var Authority = catberryURI.Authority;
var util = require('util');
var hrTimeHelper = require('./helpers/hrTimeHelper');

var TRACE_INCOMING_REQUEST = 'Request to %s "%s" from %s:%d';
var TRACE_END_RESPONSE = 'Response from %s "%s" to %s:%d (%s)';

var RequestRouter = (function () {
  function RequestRouter($serviceLocator) {
    _classCallCheck(this, RequestRouter);

    this._contextFactory = null;
    this._logger = null;
    this._documentRenderer = null;
    this._urlArgsProvider = null;
    this._serviceLocator = null;

    this._documentRenderer = $serviceLocator.resolve('documentRenderer');
    this._urlArgsProvider = $serviceLocator.resolve('urlArgsProvider');
    this._contextFactory = $serviceLocator.resolve('contextFactory');
    this._logger = $serviceLocator.resolve('logger');
    this._serviceLocator = $serviceLocator;
  }

  /**
   * Current context factory.
   * @type {ContextFactory}
   * @private
   */

  _createClass(RequestRouter, [{
    key: 'route',

    /**
     * Creates routing context, gets application state and pass it to renderer.
     * @param {http.IncomingMessage} request HTTP request.
     * @param {http.ServerResponse} response HTTP response.
     * @param {Function?} next Next function for middleware.
     */
    value: function route(request, response, next) {
      var _this = this;

      if (!(next instanceof Function)) {
        next = function () {};
      }

      if (request.method !== 'GET') {
        next();
        return;
      }

      var location, referrer;
      var cookieString = '';
      var userAgent = '';

      try {
        location = new URI(request.url);
      } catch (e) {
        location = new URI();
      }

      try {
        referrer = new URI(request.headers.referer);
      } catch (e) {
        referrer = new URI();
      }

      if (request.headers) {
        location.authority = new Authority(request.headers.host);
        userAgent = String(request.headers['user-agent'] || '');
        cookieString = String(request.headers.cookie || '');
      }

      var args = this._urlArgsProvider.getArgsByUri(location);
      var signal = this._urlArgsProvider.getSignalByUri(location);

      if (!args || !signal) {
        next();
        return;
      }

      var routingContext = this._contextFactory.create({
        referrer: referrer, location: location, userAgent: userAgent,
        middleware: { response: response, next: next }
      });

      routingContext.cookie.initWithString(cookieString);

      var requestStartTime = hrTimeHelper.get();
      var method = request.method;
      var uriPath = request.url;
      var address = request.socket.remoteAddress;
      var port = request.socket.remotePort;

      this._logger.trace(util.format(TRACE_INCOMING_REQUEST, method, uriPath, address, port));

      response.on('finish', function () {
        var requestDuration = hrTimeHelper.get(requestStartTime);

        _this._logger.trace(util.format(TRACE_END_RESPONSE, method, uriPath, address, port, hrTimeHelper.toMessage(requestDuration)));
      });

      this._documentRenderer.render({ args: args, signal: signal }, routingContext);
    }
  }]);

  return RequestRouter;
})();

module.exports = RequestRouter;

/**
 * Logger reference
 * @type {Logger}
 * @private
 */

/**
 * Current page renderer.
 * @type {DocumentRenderer}
 * @private
 */

/**
 * Current url args provider.
 * @type {URLArgsProvider}
 * @private
 */

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */