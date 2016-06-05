'use strict';

const URI = require('catberry-uri').URI;

const ERROR_DOCUMENT_RENDERER = 'Document renderer must be register in service locator.';

class RequestRouter {
  /**
   * Client-side router
   * @param {ServiceLocator} $serviceLocator
   */
  constructor ($serviceLocator) {
    /**
     * Current event bus.
     * @type {EventEmitter}
     * @private
     */
    this._eventBus = $serviceLocator.resolve('eventBus');

    /**
     * Current browser window.
     * @type {Window}
     * @private
     */
    this._window = $serviceLocator.resolve('window');

    /**
     * Current URL args provider.
     * @type {URLArgsProvider}
     * @private
     */
    this._urlArgsProvider = $serviceLocator.resolve('urlArgsProvider');

    /**
     * Current context factory.
     * @type {ContextFactory}
     * @private
     */
    this._contextFactory = $serviceLocator.resolve('contextFactory');

    /**
     * Current location.
     * @type {URI}
     * @private
     */
    this._location = null;

    /**
     * Current referrer.
     * @type {String|URI}
     * @private
     */
    this._referrer = '';

    /**
     * Current initialization flag.
     * @type {boolean}
     * @private
     */
    this._isStateInitialized = false;

    /**
     * True if current browser supports history API.
     * @type {boolean}
     * @private
     */
    this._isHistorySupported = this._window.history && this._window.history.pushState instanceof Function;

    /**
     * Current document renderer.
     * @type {DocumentRenderer}
     * @private
     */
    try {
      this._documentRenderer = locator.resolve('documentRenderer');
    } catch (e) {
      this._eventBus.emit('error', new Error(ERROR_DOCUMENT_RENDERER));
      return;
    }

    // add event handlers
    this._wrapDocument();

    this._changeState(new URI(this._window.location.toString()))
      .catch(reason => this._handleError(reason));
  }

  /**
   * Route to current URL state
   * @return {Promise}
   */
  route () {
    // because now location was not change yet and
    // different browsers handle `popstate` differently
    // we need to do route in next iteration of event loop
    return Promise.resolve()
      .then(() => {
        var newLocation = new URI(this._window.location.toString());
        var newAuthority = newLocation.authority ? newLocation.authority.toString() : null;
        var currentAuthority = this._location.authority ? this._location.authority.toString() : null;

        if (newLocation.scheme !== this._location.scheme || newAuthority !== currentAuthority) {
          return Promise.resolve();
        }

        // if only URI fragment is changed
        var newQuery = newLocation.query ? newLocation.query.toString() : null;
        var currentQuery = this._location.query ? this._location.query.toString() : null;

        if (newLocation.path === this._location.path && newQuery === currentQuery) {
          this._location = newLocation;
          return Promise.resolve();
        }

        return this._changeState(newLocation);
      });
  }

  /**
   * Sets application state to specified URI.
   * @param {string} locationString URI to go.
   * @returns {Promise} Promise for nothing.
   */
  go (locationString) {
    return Promise.resolve()
      .then(() => {
        var location = new URI(locationString);
        location = location.resolveRelative(this._location);
        locationString = location.toString();

        var currentAuthority = this._location.authority ? this._location.authority.toString() : null;
        var newAuthority = location.authority ? location.authority.toString() : null;

        // we must check if this is an external link before map URI
        // to internal application state
        if (!this._isHistorySupported ||
          location.scheme !== this._location.scheme ||
          newAuthority !== currentAuthority) {
          this._window.location.assign(locationString);
          return Promise.resolve();
        }

        var args = this._urlArgsProvider.getArgsByUri(location);

        if (!args) {
          this._window.location.assign(locationString);
          return Promise.resolve();
        }

        this._window.history.pushState({}, '', locationString);
        return this.route();
      });
  }

  /**
   * Changes the current application state with the new location.
   * @param {Object} newLocation New location
   * @returns {Promise} Promise for nothing.
   * @private
   */
  _changeState (newLocation) {
    return Promise.resolve()
      .then(() => {
        this._location = newLocation;
        var args = this._urlArgsProvider.getArgsByUri(newLocation);

        var routingContext = this._contextFactory.create({
          args,
          headers: null,
          referrer: this._referrer || this._window.document.referrer,
          location: this._location,
          userAgent: this._window.navigator.userAgent
        });

        if (!this._isStateInitialized) {
          this._isStateInitialized = true;
          return this._documentRenderer.initWithState(routingContext);
        }

        if (!args) {
          window.location.reload();
          return Promise.resolve();
        }

        return this._documentRenderer.updateState(routingContext);
      })
      .then(() => {
        this._referrer = this._location;
      });
  }

  /**
   * Wraps the document with required events to route requests.
   * @private
   */
  _wrapDocument () {
    if (!this._isHistorySupported) {
      return;
    }

    this._window.addEventListener('popstate', () => {
      this.route()
        .catch(this._handleError.bind(this));
    });
  }

  /**
   * Handles all errors.
   * @param {Error} error Error to handle.
   * @private
   */
  _handleError (error) {
    this._eventBus.emit('error', error);
  }
}

module.exports = RequestRouter;
