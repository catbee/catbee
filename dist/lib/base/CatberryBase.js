'use strict';

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var ServiceLocator = require('catberry-locator');

var CatberryBase =
/**
 * Creates new instance of the basic Catbee application module
 * @constructor
 */
function CatberryBase() {
  _classCallCheck(this, CatberryBase);

  this.version = '1.0.0';
  this.events = null;
  this.locator = null;

  this.locator = new ServiceLocator();
  this.locator.registerInstance('serviceLocator', this.locator);
  this.locator.registerInstance('catberry', this);
}

/**
 * Current version of catbee.
 * @type {String}
 */
;

module.exports = CatberryBase;

/**
 * Current object with events.
 * @type {ModuleApiProvider}
 */

/**
 * Current service locator.
 * @type {ServiceLocator}
 */