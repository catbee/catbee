var catberryURI = require('catberry-uri');
var URI = catberryURI.URI;
var Authority = catberryURI.Authority;

class RequestRouter {
  constructor ($serviceLocator) {
    this._documentRenderer = $serviceLocator.resolve('documentRenderer');
    this._stateProvider = $serviceLocator.resolve('stateProvider');
    this._contextFactory = $serviceLocator.resolve('contextFactory');
    this._serviceLocator = $serviceLocator;
  }

  /**
   * Current context factory.
   * @type {ContextFactory}
   * @private
   */
  _contextFactory = null;

  /**
   * Current page renderer.
   * @type {DocumentRenderer}
   * @private
   */
  _documentRenderer = null;

  /**
   * Current state provider.
   * @type {StateProvider}
   * @private
   */
  _stateProvider = null;

  /**
   * Current service locator.
   * @type {ServiceLocator}
   * @private
   */
  _serviceLocator = null;

  /**
   * Creates routing context, gets application state and pass it to renderer.
   * @param {http.IncomingMessage} request HTTP request.
   * @param {http.ServerResponse} response HTTP response.
   * @param {Function?} next Next function for middleware.
   */
  route (request, response, next) {
    if (!(next instanceof Function)) {
      next = () => {};
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

    var state = this._stateProvider.getStateByUri(location);
    if (!state) {
      next();
      return;
    }

    var routingContext = this._contextFactory.create({
      referrer: referrer,
      location: location,
      userAgent: userAgent,
      middleware: { response, next }
    });

    routingContext.cookie.initWithString(cookieString);
    this._documentRenderer.render(state, routingContext);
  }
}

module.exports = RequestRouter;
