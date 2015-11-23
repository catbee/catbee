var UglifyJS = require('uglify-js');
var stream = require('stream');

class UglifyTransform extends stream.Transform {
  /**
   * Creates new instance of Uglify source code transform.
   * @param {ServiceLocator} $serviceLocator Stream options.
   * @param {Object?} options Stream options.
   * @constructor
   * @extends Transform
   */
  constructor ($serviceLocator, options) {
    super(options);
    this._injectionFinder = $serviceLocator.resolve('injectionFinder');
  }

  /**
   * Current source code accumulator.
   * @type {string}
   * @private
   */
  _sourceCode = '';

  /**
   * Current injection finder.
   * @type {InjectionFinder}
   * @private
   */
  _injectionFinder = null;

  /**
   * Transforms a chunk of data.
   * @param {Buffer} chunk Stream chunk.
   * @param {string} encoding Chunk buffer encoding.
   * @param {Function} callback Chunk transform callback.
   * @private
   */
  _transform (chunk, encoding, callback) {
    this._sourceCode += chunk.toString();
    callback();
  }

  /**
   * Flushes minified source code to the consumer.
   * @param {Function} callback Flush callback.
   * @private
   */
  _flush (callback) {
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
}

module.exports = UglifyTransform;
