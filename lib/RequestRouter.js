'use strict';

var catberryURI = require('catberry-uri');
var URI = catberryURI.URI;
var Authority = catberryURI.Authority;
var hrTimeHelper = require('./helpers/hrTimeHelper');

class RequestRouter {
  constructor (locator) {
    this._documentRenderer = locator.resolve('documentRenderer');
    this._urlArgsProvider = locator.resolve('urlArgsProvider');
    this._contextFactory = locator.resolve('contextFactory');
    this._serviceLocator = locator;
  }

  // Creates routing context, gets application state and pass it to renderer.
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
    var headers = null;

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

      headers = request.headers;
    }

    var args = this._urlArgsProvider.getArgsByUri(location);

    if (!args) {
      next();
      return;
    }

    var routingContext = this._contextFactory.create({
      args, referrer, location, userAgent, headers, middleware: { response, next }
    });

    routingContext.cookie.initWithString(cookieString);
    this._documentRenderer.render(routingContext);
  }
}

module.exports = RequestRouter;
