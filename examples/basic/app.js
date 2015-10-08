/**
 * Сборщик серверного приложения на основе
 * <catberry> и <express>. Служит для
 * создания инстанса приложения.
 */
var catberry = require('../../index');
var express = require('express');

/**
 * Создание инстанса приложения
 *
 * @param {Object} config - application config
 * @returns {Promise} - express app
 */
exports.create = function create (config = {}) {
  var cat = catberry.create(config);
  var app = express();

  app.use(cat.getMiddleware());

  return Promise.resolve(app);
};
