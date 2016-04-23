module.exports = {
  // Defines read-only property.
  defineReadOnly (object, name, value) {
    Object.defineProperty(object, name, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: value
    });
  }
};
