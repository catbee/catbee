'use strict';

var EventEmitter = require('events').EventEmitter;

class UniversalMock extends EventEmitter {
  constructor (methodNames) {
    super();
    this.setMaxListeners(0);

    methodNames.forEach(name => {
      this[name] = () => {
        this.emit(name, arguments);
        return Promise.resolve();
      };
    });
  }

  decorateMethod (name, method) {
    var old = this[name];
    if (typeof (old) !== 'function') {
      return;
    }
    this[name] = function () {
      old.apply(this, arguments);
      return method.apply(this, arguments);
    };
  }
}

module.exports = UniversalMock;
