'use strict';

const catberryURI = require('catberry-uri');
const URI = catberryURI.URI;
const Authority = catberryURI.Authority;
const hrTimeHelper = require('./helpers/hrTimeHelper');

const ERROR_DOCUMENT_RENDERER = 'Document renderer must be register in service locator.';

class RequestRouter {
  /**
   * Server-side router.
   * Handle incoming http requests, prepare routing context
   * and send render command to document renderer.
   * @param {ServiceLocator} locator
   */
  constructor (locator) {
    this._eventBus = locator.resolve('eventBus');

    try {
      this._documentRenderer = locator.resolve('documentRenderer');
    } catch (e) {
      this._eventBus.emit('error', new Error(ERROR_DOCUMENT_RENDERER));
    }

    this._urlArgsProvider = locator.resolve('urlArgsProvider');
    this._contextFactory = locator.resolve('contextFactory');
    this._serviceLocator = locator;
  }

  /**
   * Creates routing context, gets application url state and pass it to renderer.
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   */
  route (request, response, next) {
    if (!(next instanceof Function)) {
      next = () => {};
    }

    if (request.method !== 'GET') {
      next();
      return;
    }

    let location, referrer;
    let cookieString = '';
    let userAgent = '';
    let headers = null;

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

    const args = this._urlArgsProvider.getArgsByUri(location);

    if (!args) {
      next();
      return;
    }

    const routingContext = this._contextFactory.create({
      args, referrer, location, userAgent, headers,
      middleware: {
        response, next
      }
    });

    routingContext.cookie.initWithString(cookieString);

    const requestStartTime = hrTimeHelper.get();
    this._eventBus.emit('serverRequest', { routingContext, requestStartTime });

    if (this._documentRenderer) {
      this._documentRenderer.render(routingContext);
      return;
    }

    response.once('finish', () => {
      const requestDuration = hrTimeHelper.get(requestStartTime);
      this._eventBus.emit('serverRequestFinish', { routingContext, requestDuration });
    });

    next();
  }
}

module.exports = RequestRouter;
