class LoaderBase {
  /**
   * Create basic implementation of a module loader.
   * @param {Array} transforms Array of module transformations.
   * @constructor
   */
  constructor (transforms) {
    this._transforms = transforms;
  }

  /**
   * Current transform list
   * @type {Array}
   * @private
   */
  _transforms = null;

  /**
   * Applies all transformations registered in Service Locator.
   * @param {Object} module Loaded module.
   * @param {number?} index Transformation index in a list.
   * @returns {Promise<Object|Array>} Transformed module.
   * @protected
   */
  _applyTransforms (module, index) {
    if (index === undefined) {
      // the list is a stack, we should reverse it
      index = this._transforms.length - 1;
    }

    if (index < 0) {
      return Promise.resolve(module);
    }

    var transformation = this._transforms[index];

    return Promise.resolve()
      .then(() => transformation.transform(module))
      .then(transformedModule => this._applyTransforms(transformedModule, index - 1));
  }
}

module.exports = LoaderBase;
