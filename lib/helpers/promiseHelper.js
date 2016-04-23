module.exports = {
  // Converts method with callback to method that returns promise.
  callbackToPromise (methodWithCallback) {
    return function () {
      const args = Array.prototype.slice.call(arguments);

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
