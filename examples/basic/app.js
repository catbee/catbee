/**
 * Сборщик серверного приложения на основе
 * <catberry> и <express>. Служит для
 * создания инстанса приложения.
 */
var catberry = require('../../index');
var express = require('express');
var handlebars = require('catberry-handlebars');
var uhr = require('catberry-uhr');

/**
 * Создание инстанса приложения
 *
 * @param {Object} config - application config
 * @returns {Promise} - express app
 */
exports.create = function create (config = {}) {
  var cat = catberry.create(config);
  var app = express();

  handlebars.register(cat.locator);
  uhr.register(cat.locator);

  app.use(cat.getMiddleware());

  return Promise.resolve(app);
};
