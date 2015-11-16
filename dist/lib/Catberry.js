'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var CatberryBase = require('./base/CatberryBase');

var Catberry = (function (_CatberryBase) {
  _inherits(Catberry, _CatberryBase);

  /**
   * Creates new instance of the server-side Catberry.
   * @constructor
   * @extends CatberryBase
   */

  function Catberry() {
    _classCallCheck(this, Catberry);

    _get(Object.getPrototypeOf(Catberry.prototype), 'constructor', this).call(this);
    this._router = null;
  }

  /**
   * Current request router.
   * @type {RequestRouter}
   * @private
   */

  _createClass(Catberry, [{
    key: 'getMiddleware',

    /**
     * Gets connect/express middleware.
     * @returns {Function} Middleware function.
     */
    value: function getMiddleware() {
      this._router = this.locator.resolve('requestRouter');
      return this._router.route.bind(this._router);
    }

    /**
     * Builds browser bundle.
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'build',
    value: function build() {
      var builder = this.locator.resolve('browserBundleBuilder');
      return builder.build();
    }
  }]);

  return Catberry;
})(CatberryBase);

module.exports = Catberry;