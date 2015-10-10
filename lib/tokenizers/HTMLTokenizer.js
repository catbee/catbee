const COMPONENT_TAG_NAME_REGEXP = /^<((cat-)|((document|head|body)[\s/>]))/i;
const COMPONENT_NAME_MIN_LENGTH = 10;

class HTMLTokenizer {
  /**
   * Current token buffer.
   * @type {string}
   * @private
   */
  _source = '';

  /**
   * Current index in buffer.
   * @type {number}
   * @private
   */
  _currentIndex = 0;

  /**
   * Current token identifier.
   * @type {number}
   * @private
   */
  _currentState = HTMLTokenizer.STATES.INITIAL;

  /**
   * Sets HTML string to the tokenizer.
   * @param {string} html HTML string.
   */
  setHTMLString (html) {
    this._source = html;
    this._currentIndex = 0;
    this._currentState = HTMLTokenizer.STATES.INITIAL;
  }

  /**
   * Gets next token.
   * @returns {{state: number, value: string}} Token descriptor.
   */
  next () {
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
  initial () {
    if (this._currentIndex >= this._source.length) {
      this._currentState = HTMLTokenizer.STATES.END;
      return;
    }

    // maybe comment or component
    if (this._source[this._currentIndex] === '<') {
      // comment
      if (this._source[this._currentIndex + 1] === '!') {
        if (this._source[this._currentIndex + 2] === '-' &&
          this._source[this._currentIndex + 3] === '-') {
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
  component () {
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
  content () {
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
  comment () {
    this._currentIndex += 4;

    while (this._currentIndex < this._source.length) {
      if (this._source[this._currentIndex] === '-') {
        if (this._currentIndex + 2 >= this._source.length) {
          this._currentState = HTMLTokenizer.STATES.ILLEGAL;
          return;
        }

        if (this._source[this._currentIndex + 1] === '-' &&
          this._source[this._currentIndex + 2] === '>') {
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
  checkIfComponent () {
    var testString = this._source.substr(this._currentIndex, COMPONENT_NAME_MIN_LENGTH);
    return COMPONENT_TAG_NAME_REGEXP.test(testString);
  }

  static STATES = {
    ILLEGAL: -1,
    INITIAL: 0,
    CONTENT: 1,
    COMPONENT: 2,
    COMMENT: 3,
    END: 4
  };
}

module.exports = HTMLTokenizer;
