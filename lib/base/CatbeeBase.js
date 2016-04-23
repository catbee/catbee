'use strict';

var ServiceLocator = require('catberry-locator');

class CatbeeBase {
  // Creates new instance of the basic Catbee application module
  constructor () {
    this.version = '3.0.0-dev';
    this.locator = new ServiceLocator();
    this.locator.registerInstance('serviceLocator', this.locator);
    this.locator.registerInstance('catbee', this);
  }
}

module.exports = CatbeeBase;
