'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var util = require('util');
var URI = require('catberry-uri').URI;

var MOUSE_PRIMARY_KEY = 0;
var HREF_ATTRIBUTE_NAME = 'href';
var TARGET_ATTRIBUTE_NAME = 'target';
var A_TAG_NAME = 'A';
var BODY_TAG_NAME = 'BODY';

var RequestRouter = (function () {
  /**
   * Client-side router
   * @param {ServiceLocator} $serviceLocator
   */

  function RequestRouter($serviceLocator) {
    var _this = this;

    _classCallCheck(this, RequestRouter);

    this._isStateInitialized = false;
    this._referrer = '';
    this._location = null;
    this._eventBus = null;
    this._contextFactory = null;
    this._urlArgsProvider = null;
    this._documentRenderer = null;
    this._window = null;
    this._isHistorySupported = false;

    this._eventBus = $serviceLocator.resolve('eventBus');
    this._window = $serviceLocator.resolve('window');
    this._urlArgsProvider = $serviceLocator.resolve('urlArgsProvider');
    this._contextFactory = $serviceLocator.resolve('contextFactory');
    this._documentRenderer = $serviceLocator.resolve('documentRenderer');

    this._isHistorySupported = this._window.history && this._window.history.pushState instanceof Function;

    // add event handlers
    this._wrapDocument();

    this._changeState(new URI(this._window.location.toString()))['catch'](function (reason) {
      return _this._handleError(reason);
    });
  }

  /**
   * Finds the closest ascending "A" element node.
   * @param {Node} element DOM element.
   * @returns {Node|null} The closest "A" element or null.
   */

  /**
   * Current initialization flag.
   * @type {boolean}
   * @private
   */

  _createClass(RequestRouter, [{
    key: 'route',

    /**
     * Routes browser render request.
     * @returns {Promise} Promise for nothing.
     */
    value: function route() {
      var _this2 = this;

      // because now location was not change yet and
      // different browsers handle `popstate` differently
      // we need to do route in next iteration of event loop
      return _Promise.resolve().then(function () {
        var newLocation = new URI(_this2._window.location.toString());
        var newAuthority = newLocation.authority ? newLocation.authority.toString() : null;
        var currentAuthority = _this2._location.authority ? _this2._location.authority.toString() : null;

        if (newLocation.scheme !== _this2._location.scheme || newAuthority !== currentAuthority) {
          return;
        }

        // if only URI fragment is changed
        var newQuery = newLocation.query ? newLocation.query.toString() : null;
        var currentQuery = _this2._location.query ? _this2._location.query.toString() : null;

        if (newLocation.path === _this2._location.path && newQuery === currentQuery) {
          _this2._location = newLocation;
          return;
        }

        return _this2._changeState(newLocation);
      });
    }

    /**
     * Sets application state to specified URI.
     * @param {string} locationString URI to go.
     * @param {Boolean} isSilent
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'go',
    value: function go(locationString) {
      var _this3 = this;

      var isSilent = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      return _Promise.resolve().then(function () {
        var location = new URI(locationString);
        location = location.resolveRelative(_this3._location);
        locationString = location.toString();

        var currentAuthority = _this3._location.authority ? _this3._location.authority.toString() : null;
        var newAuthority = location.authority ? location.authority.toString() : null;

        // we must check if this is an external link before map URI
        // to internal application state
        if (!_this3._isHistorySupported || location.scheme !== _this3._location.scheme || newAuthority !== currentAuthority) {
          _this3._window.location.assign(locationString);
          return;
        }

        var args = _this3._urlArgsProvider.getArgsByUri(location);
        var signal = _this3._urlArgsProvider.getSignalByUri(location);

        if (!args || !signal) {
          _this3._window.location.assign(locationString);
          return;
        }

        _this3._window.history.pushState({ isSilent: isSilent }, '', locationString);
        return _this3.route();
      });
    }

    /**
     * Changes current application state with new location.
     * @param {URI} newLocation New location.
     * @returns {Promise} Promise for nothing.
     * @private
     */
  }, {
    key: '_changeState',
    value: function _changeState(newLocation) {
      var _this4 = this;

      return _Promise.resolve().then(function () {
        _this4._location = newLocation;
        var args = _this4._urlArgsProvider.getArgsByUri(newLocation);
        var signal = _this4._urlArgsProvider.getSignalByUri(newLocation);

        var routingContext = _this4._contextFactory.create({
          referrer: _this4._referrer || _this4._window.document.referrer,
          location: _this4._location,
          userAgent: _this4._window.navigator.userAgent
        });

        if (!_this4._isStateInitialized) {
          _this4._isStateInitialized = true;
          return _this4._documentRenderer.initWithState({ args: args, signal: signal }, routingContext);
        }

        if (!args || !signal) {
          window.location.reload();
          return;
        }

        return _this4._documentRenderer.updateState({ args: args, signal: signal }, routingContext);
      }).then(function () {
        return _this4._referrer = _this4._location;
      });
    }

    /**
     * Wraps document with required events to route requests.
     * @private
     */
  }, {
    key: '_wrapDocument',
    value: function _wrapDocument() {
      var _this5 = this;

      if (!this._isHistorySupported) {
        return;
      }

      this._window.addEventListener('popstate', function () {
        _this5.route()['catch'](_this5._handleError.bind(_this5));
      });

      this._window.document.body.addEventListener('click', function (event) {
        if (event.defaultPrevented) {
          return;
        }

        if (event.target.tagName === A_TAG_NAME) {
          _this5._linkClickHandler(event, event.target);
        } else {
          var link = closestLink(event.target);
          if (!link) {
            return;
          }
          _this5._linkClickHandler(event, link);
        }
      });
    }

    /**
     * Handles link click on the page.
     * @param {Event} event Event-related object.
     * @param {Element} element Link element.
     * @private
     */
  }, {
    key: '_linkClickHandler',
    value: function _linkClickHandler(event, element) {
      var targetAttribute = element.getAttribute(TARGET_ATTRIBUTE_NAME);
      if (targetAttribute) {
        return;
      }

      // if middle mouse button was clicked
      if (event.button !== MOUSE_PRIMARY_KEY || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      var locationString = element.getAttribute(HREF_ATTRIBUTE_NAME);
      if (!locationString) {
        return;
      }
      if (locationString[0] === '#') {
        return;
      }

      event.preventDefault();
      this.go(locationString)['catch'](this._handleError.bind(this));
    }

    /**
     * Handles all errors.
     * @param {Error} error Error to handle.
     * @private
     */
  }, {
    key: '_handleError',
    value: function _handleError(error) {
      this._eventBus.emit('error', error);
    }
  }]);

  return RequestRouter;
})();

function closestLink(element) {
  while (element && element.nodeName !== A_TAG_NAME && element.nodeName !== BODY_TAG_NAME) {
    element = element.parentNode;
  }
  return element && element.nodeName === A_TAG_NAME ? element : null;
}

module.exports = RequestRouter;

/**
 * Current referrer.
 * @type {String|URI}
 * @private
 */

/**
 * Current location.
 * @type {URI}
 * @private
 */

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */

/**
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */

/**
 * Current state provider.
 * @type {URLArgsProvider}
 * @private
 */

/**
 * Current document renderer.
 * @type {DocumentRenderer}
 * @private
 */

/**
 * Current browser window.
 * @type {Window}
 * @private
 */

/**
 * True if current browser supports history API.
 * @type {boolean}
 * @private
 */