var util = require('util');
var EventEmitter = require('events').EventEmitter;

class ComponentFinder extends EventEmitter {
  constructor (components) {
    super();
    this._toFind = components;
  }

  find () {
    return new Promise((resolve) => {
      setTimeout(() => {
        this._found = this._toFind;
        resolve(this._found);
      }, 100);
    });
  }

  watch () {

  }
}

module.exports = ComponentFinder;
