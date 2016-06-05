module.exports = {
  /**
   * Defines read-only property.
   * @param {Object} object Object to define property in.
   * @param {string} name Name of the property.
   * @param {*} value Property value.
   */
  defineReadOnly (object, name, value) {
    Object.defineProperty(object, name, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: value
    });
  }
};
