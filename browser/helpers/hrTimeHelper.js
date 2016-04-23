module.exports = {
  // Gets the high resolution time or the difference between previous and current time.
  get: require('browser-process-hrtime'),

  // Converts the high resolution timestamp to text message.
  toMessage: require('pretty-hrtime'),

  // Converts high resolution time to milliseconds number.
  toMilliseconds: (hrTime) => {
    return hrTime[0] * 1e3 + Math.round(hrTime[1] / 1e6);
  }
};
