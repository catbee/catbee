'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var UglifyJS = require('uglify-js');
var stream = require('stream');
var util = require('util');

var UglifyTransform = (function (_stream$Transform) {
  _inherits(UglifyTransform, _stream$Transform);

  /**
   * Creates new instance of Uglify source code transform.
   * @param {ServiceLocator} $serviceLocator Stream options.
   * @param {Object?} options Stream options.
   * @constructor
   * @extends Transform
   */

  function UglifyTransform($serviceLocator, options) {
    _classCallCheck(this, UglifyTransform);

    _get(Object.getPrototypeOf(UglifyTransform.prototype), 'constructor', this).call(this, options);
    this._sourceCode = '';
    this._injectionFinder = null;
    this._injectionFinder = $serviceLocator.resolve('injectionFinder');
  }

  /**
   * Current source code accumulator.
   * @type {string}
   * @private
   */

  _createClass(UglifyTransform, [{
    key: '_transform',

    /**
     * Transforms a chunk of data.
     * @param {Buffer} chunk Stream chunk.
     * @param {string} encoding Chunk buffer encoding.
     * @param {Function} callback Chunk transform callback.
     * @private
     */
    value: function _transform(chunk, encoding, callback) {
      this._sourceCode += chunk.toString();
      callback();
    }

    /**
     * Flushes minified source code to the consumer.
     * @param {Function} callback Flush callback.
     * @private
     */
  }, {
    key: '_flush',
    value: function _flush(callback) {
      try {
        var ast = UglifyJS.parse(this._sourceCode);
        var compressor = UglifyJS.Compressor({ warnings: false });
        var exceptNames = this._injectionFinder.find(ast);

        ast.figure_out_scope();
        ast = ast.transform(compressor);
        ast.figure_out_scope();
        ast.mangle_names({
          except: exceptNames,
          toplevel: true
        });

        this.push(ast.print_to_string());
        callback();
      } catch (e) {
        this.emit('error', e);
      }
    }
  }]);

  return UglifyTransform;
})(stream.Transform);

/**
 * Current injection finder.
 * @type {InjectionFinder}
 * @private
 */