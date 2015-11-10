var body = require('../actions/body');

exports.mainPageLoad = [
  body.setState,
  body.getState,
  body.setComputed
];
