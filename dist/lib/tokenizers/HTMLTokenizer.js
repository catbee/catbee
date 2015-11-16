'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var COMPONENT_TAG_NAME_REGEXP = /^<((cat-)|((document|head|body)[\s/>]))/i;
var COMPONENT_NAME_MIN_LENGTH = 10;

var HTMLTokenizer = (function () {
  function HTMLTokenizer() {
    _classCallCheck(this, HTMLTokenizer);

    this._source = '';
    this._currentIndex = 0;
    this._currentState = HTMLTokenizer.STATES.INITIAL;
  }

  _createClass(HTMLTokenizer, [{
    key: 'setHTMLString',

    /**
     * Sets HTML string to the tokenizer.
     * @param {string} html HTML string.
     */
    value: function setHTMLString(html) {
      this._source = html;
      this._currentIndex = 0;
      this._currentState = HTMLTokenizer.STATES.INITIAL;
    }

    /**
     * Gets next token.
     * @returns {{state: number, value: string}} Token descriptor.
     */
  }, {
    key: 'next',
    value: function next() {
      var start = this._currentIndex;
      var state = this._currentState;

      switch (this._currentState) {
        case HTMLTokenizer.STATES.CONTENT:
          this.content();
          break;
        case HTMLTokenizer.STATES.COMPONENT:
          this.component();
          break;
        case HTMLTokenizer.STATES.COMMENT:
          this.comment();
          break;
        case HTMLTokenizer.STATES.END:
          return {
            state: state,
            value: null
          };
        case HTMLTokenizer.STATES.ILLEGAL:
          this._currentState = HTMLTokenizer.STATES.INITIAL;
          this._currentIndex++;
          break;
        default:
          this.initial();
          return this.next();
      }

      return {
        state: state,
        value: this._source.substring(start, this._currentIndex)
      };
    }

    /**
     * Switches machine to the "data" state.
     */
  }, {
    key: 'initial',
    value: function initial() {
      if (this._currentIndex >= this._source.length) {
        this._currentState = HTMLTokenizer.STATES.END;
        return;
      }

      // maybe comment or component
      if (this._source[this._currentIndex] === '<') {
        // comment
        if (this._source[this._currentIndex + 1] === '!') {
          if (this._source[this._currentIndex + 2] === '-' && this._source[this._currentIndex + 3] === '-') {
            this._currentState = HTMLTokenizer.STATES.COMMENT;
            return;
          }

          this._currentState = HTMLTokenizer.STATES.CONTENT;
          return;
        }

        if (this.checkIfComponent()) {
          this._currentState = HTMLTokenizer.STATES.COMPONENT;
          return;
        }
      }

      this._currentState = HTMLTokenizer.STATES.CONTENT;
    }

    /**
     * Switches machine to the "tag" state.
     */
  }, {
    key: 'component',
    value: function component() {
      this._currentIndex += 5;
      while (this._currentIndex < this._source.length) {
        if (this._source[this._currentIndex] === '>') {
          this._currentIndex++;
          this._currentState = HTMLTokenizer.STATES.INITIAL;
          return;
        }
        this._currentIndex++;
      }
      this._currentState = HTMLTokenizer.STATES.ILLEGAL;
    }

    /**
     * Switches machine to the "content" state.
     */
  }, {
    key: 'content',
    value: function content() {
      this._currentIndex++;
      while (this._currentIndex < this._source.length) {
        if (this._source[this._currentIndex] === '<') {
          this._currentState = HTMLTokenizer.STATES.INITIAL;
          return;
        }
        this._currentIndex++;
      }
      this._currentState = HTMLTokenizer.STATES.END;
    }

    /**
     * Switches machine to the "comment" state.
     */
  }, {
    key: 'comment',
    value: function comment() {
      this._currentIndex += 4;

      while (this._currentIndex < this._source.length) {
        if (this._source[this._currentIndex] === '-') {
          if (this._currentIndex + 2 >= this._source.length) {
            this._currentState = HTMLTokenizer.STATES.ILLEGAL;
            return;
          }

          if (this._source[this._currentIndex + 1] === '-' && this._source[this._currentIndex + 2] === '>') {
            this._currentIndex += 3;
            this._currentState = HTMLTokenizer.STATES.INITIAL;
            return;
          }
        }
        this._currentIndex++;
      }
      this._currentState = HTMLTokenizer.STATES.ILLEGAL;
    }

    /**
     * Checks if following HTML is a component.
     * @returns {boolean}
     */
  }, {
    key: 'checkIfComponent',
    value: function checkIfComponent() {
      var testString = this._source.substr(this._currentIndex, COMPONENT_NAME_MIN_LENGTH);
      return COMPONENT_TAG_NAME_REGEXP.test(testString);
    }
  }], [{
    key: 'STATES',
    value: {
      ILLEGAL: -1,
      INITIAL: 0,
      CONTENT: 1,
      COMPONENT: 2,
      COMMENT: 3,
      END: 4
    },
    enumerable: true
  }]);

  return HTMLTokenizer;
})();

module.exports = HTMLTokenizer;

/**
 * Current token buffer.
 * @type {string}
 * @private
 */

/**
 * Current index in buffer.
 * @type {number}
 * @private
 */

/**
 * Current token identifier.
 * @type {number}
 * @private
 */