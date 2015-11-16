'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var CatberryBase = require('../lib/base/CatberryBase');

var Catberry = (function (_CatberryBase) {
  _inherits(Catberry, _CatberryBase);

  /**
   * Creates new instance of the browser version of Catberry.
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
    key: 'wrapDocument',

    /**
     * Wraps current HTML document with Catberry event handlers.
     */
    value: function wrapDocument() {
      this._router = this.locator.resolve('requestRouter');
    }

    /**
     * Starts Catberry application when DOM is ready.
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'startWhenReady',
    value: function startWhenReady() {
      var _this = this;

      if (window.catbee) {
        return _Promise.resolve();
      }

      return new _Promise(function (resolve) {
        window.document.addEventListener('DOMContentLoaded', function () {
          _this.wrapDocument();
          window.catbee = _this;
          resolve();
        });
      });
    }
  }]);

  return Catberry;
})(CatberryBase);

module.exports = Catberry;