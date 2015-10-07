module.exports = {
  /**
   * Converts method with callback to method that returns promise.
   * @param {Function} methodWithCallback Method with callback.
   * @returns {Function} Method that returns promise.
   */
  callbackToPromise (methodWithCallback) {
    return (...args) => {
      return new Promise((fulfill, reject) => {
        args.push((error, result) => {
          if (error) {
            reject(error);
            return;
          }
          fulfill(result);
        });

        methodWithCallback.apply(this, args);
      });
    };
  }
};
