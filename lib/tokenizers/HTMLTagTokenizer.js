const WHITESPACE_TEST = /^[\u0009\u000A\u000C\u000D\u0020]$/;
const ASCII_LETTERS_TEST = /[a-z]/i;

class HTMLTagTokenizer {
  /**
   * Current source code of constructor.
   * @type {string}
   * @private
   */
  _source = '';

  /**
   * Current index in source code.
   * @type {number}
   * @private
   */
  _currentIndex = 0;

  /**
   * Current index in source code.
   * @type {number}
   * @private
   */
  _currentEnd = 0;

  /**
   * Current state.
   * @type {number}
   * @private
   */
  _currentState = HTMLTagTokenizer.STATES.NO;

  /**
   * Sets the tag string to tokenize.
   * @param {String} tagHTML Tag HTML string.
   */
  setTagString (tagHTML) {
    this._source = tagHTML;
    this._currentIndex = 0;
    this._currentEnd = 0;
    this._currentState = HTMLTagTokenizer.STATES.NO;
  }

  /**
   * Gets next token in source.
   * @returns {{state: (number), start: number, end: number}}
   */
  next () {
    var start = this._currentIndex;
    var state = this._currentState;

    switch (this._currentState) {
    case HTMLTagTokenizer.STATES.TAG_OPEN:
      this.tagOpenState();
      break;
    case HTMLTagTokenizer.STATES.TAG_NAME:
      this.tagNameState();
      break;
    case HTMLTagTokenizer.STATES.SELF_CLOSING_START_TAG_STATE:
      this.selfClosingStartTagState();
      break;
    case HTMLTagTokenizer.STATES.BEFORE_ATTRIBUTE_NAME:
      this.beforeAttributeNameState();
      break;
    case HTMLTagTokenizer.STATES.ATTRIBUTE_NAME:
      this.attributeNameState();
      break;
    case HTMLTagTokenizer.STATES.AFTER_ATTRIBUTE_NAME:
      this.afterAttributeNameState();
      break;
    case HTMLTagTokenizer.STATES.BEFORE_ATTRIBUTE_VALUE:
      this.beforeAttributeValueState();
      break;
    case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED:
      this.attributeValueDoubleQuotedState();
      break;
    case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED:
      this.attributeValueSingleQuotedState();
      break;
    case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_UNQUOTED:
      this.attributeValueUnquotedState();
      break;
    case HTMLTagTokenizer.STATES.AFTER_ATTRIBUTE_VALUE_QUOTED:
      this.afterAttributeValueQuotedState();
      break;
    case HTMLTagTokenizer.STATES.ILLEGAL:
    case HTMLTagTokenizer.STATES.TAG_CLOSE:
      return {
        state: state,
        start: start,
        end: start + 1
      };
    default:
      this._currentState = this._source[start] === '<' ?
        HTMLTagTokenizer.STATES.TAG_OPEN :
        HTMLTagTokenizer.STATES.ILLEGAL;
      return this.next();
    }

    return {
      state: state,
      start: start,
      end: this._currentEnd
    };
  }

  /**
   * Skips all whitespace characters.
   */
  skipWhitespace () {
    while (
    this._currentIndex < this._source.length &&
    WHITESPACE_TEST.test(this._source[this._currentIndex])
      ) {
      this._currentIndex++;
    }
  }

  /**
   * Describes the "Tag name state".
   */
  tagOpenState () {
    this._currentIndex++;
    this._currentEnd = this._currentIndex;
    var next = this._source[this._currentIndex];

    if (ASCII_LETTERS_TEST.test(next)) {
      this._currentState = HTMLTagTokenizer.STATES.TAG_NAME;
      return;
    }

    // this parser does not support the "Markup declaration open state" and
    // "End tag open state"
    this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
  }

  /**
   * Describes the "After attribute value state".
   */
  tagNameState () {
    this._currentIndex++;
    this._currentEnd = this._currentIndex;
    var next;
    while (this._currentIndex < this._source.length) {
      next = this._source[this._currentIndex];
      if (WHITESPACE_TEST.test(next)) {
        this._currentState = HTMLTagTokenizer.STATES.BEFORE_ATTRIBUTE_NAME;
        return;
      }

      if (next === '/') {
        this._currentState = HTMLTagTokenizer.STATES.SELF_CLOSING_START_TAG_STATE;
        return;
      }

      if (next === '>') {
        this._currentState = HTMLTagTokenizer.STATES.TAG_CLOSE;
        return;
      }

      if (next === '\u0000') {
        this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
        return;
      }

      this._currentIndex++;
      this._currentEnd = this._currentIndex;
    }

    this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
  }

  /**
   * Describes the "Self-closing start tag state".
   */
  selfClosingStartTagState () {
    this._currentIndex++;
    this._currentEnd = this._currentIndex;
    var next = this._source[this._currentIndex];
    if (next === '>') {
      this._currentState = HTMLTagTokenizer.STATES.TAG_CLOSE;
      return;
    }

    this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
  }

  /**
   * Describes the "Before attribute value state".
   */
  beforeAttributeNameState () {
    this._currentIndex++;
    this.skipWhitespace();
    this._currentEnd = this._currentIndex;

    var next = this._source[this._currentIndex];
    if (next === '/') {
      this._currentState = HTMLTagTokenizer.STATES.SELF_CLOSING_START_TAG_STATE;
      return;
    }
    if (next === '>') {
      this._currentState = HTMLTagTokenizer.STATES.TAG_CLOSE;
      return;
    }

    if (next === '\u0000' ||
      next === '"' ||
      next === '\'' ||
      next === '<' ||
      next === '=' ||
      this._currentIndex >= this._source.length) {
      this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
      return;
    }

    this._currentState = HTMLTagTokenizer.STATES.ATTRIBUTE_NAME;
  }

  /**
   * Describes the "Before attribute value state".
   */
  attributeNameState () {
    this._currentIndex++;
    this._currentEnd = this._currentIndex;
    var next;
    while (this._currentIndex < this._source.length) {
      next = this._source[this._currentIndex];
      if (WHITESPACE_TEST.test(next)) {
        this._currentState = HTMLTagTokenizer.STATES.AFTER_ATTRIBUTE_NAME;
        return;
      }

      if (next === '/') {
        this._currentState = HTMLTagTokenizer.STATES.SELF_CLOSING_START_TAG_STATE;
        return;
      }

      if (next === '=') {
        this._currentState = HTMLTagTokenizer.STATES.BEFORE_ATTRIBUTE_VALUE;
        return;
      }

      if (next === '>') {
        this._currentState = HTMLTagTokenizer.STATES.TAG_CLOSE;
        return;
      }

      if (next === '\u0000' ||
        next === '"' ||
        next === '\'' ||
        next === '<') {
        this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
        return;
      }

      this._currentIndex++;
      this._currentEnd = this._currentIndex;
    }

    this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
  }

  /**
   * Describes the "After attribute value state".
   */
  afterAttributeNameState () {
    this._currentIndex++;
    this.skipWhitespace();
    this._currentEnd = this._currentIndex;
    var next = this._source[this._currentIndex];
    if (next === '/') {
      this._currentState = HTMLTagTokenizer.STATES.SELF_CLOSING_START_TAG_STATE;
      return;
    }
    if (next === '=') {
      this._currentState = HTMLTagTokenizer.STATES.BEFORE_ATTRIBUTE_VALUE;
      return;
    }
    if (next === '>') {
      this._currentState = HTMLTagTokenizer.STATES.TAG_CLOSE;
      return;
    }

    if (next === '\u0000' ||
      next === '"' ||
      next === '\'' ||
      next === '<' ||
      this._currentIndex >= this._source.length) {
      this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
      return;
    }

    this._currentState = HTMLTagTokenizer.STATES.ATTRIBUTE_NAME;
  }

  /**
   * Describes the "Before attribute value state".
   */
  beforeAttributeValueState () {
    this._currentIndex++;
    this.skipWhitespace();
    this._currentEnd = this._currentIndex;
    var next = this._source[this._currentIndex];

    if (next === '"') {
      this._currentIndex++;
      this._currentEnd = this._currentIndex;
      this._currentState = HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
      return;
    }

    if (next === '\'') {
      this._currentIndex++;
      this._currentEnd = this._currentIndex;
      this._currentState = HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED;
      return;
    }

    if (next === '\u0000' ||
      next === '>' ||
      next === '<' ||
      next === '=' ||
      next === '`' ||
      this._currentIndex >= this._source.length) {
      this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
      return;
    }

    this._currentState = HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_UNQUOTED;
  }

  /**
   * Describes the "Attribute value (double-quoted) state".
   */
  attributeValueDoubleQuotedState () {
    this._currentEnd = this._currentIndex;
    var next;
    while (this._currentIndex < this._source.length) {
      // character reference in attribute value state is not supported
      next = this._source[this._currentIndex];
      if (next === '"') {
        this._currentState = HTMLTagTokenizer.STATES.AFTER_ATTRIBUTE_VALUE_QUOTED;
        return;
      }

      if (next === '\u0000') {
        this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
        return;
      }

      this._currentIndex++;
      this._currentEnd = this._currentIndex;
    }

    this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
  }

  /**
   * Describes the "Attribute value (single-quoted) state".
   */
  attributeValueSingleQuotedState () {
    this._currentEnd = this._currentIndex;
    var next;
    while (this._currentIndex < this._source.length) {
      // character reference in attribute value state is not supported
      next = this._source[this._currentIndex];
      if (next === '\'') {
        this._currentState = HTMLTagTokenizer.STATES.AFTER_ATTRIBUTE_VALUE_QUOTED;
        return;
      }

      if (next === '\u0000') {
        this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
        return;
      }

      this._currentIndex++;
      this._currentEnd = this._currentIndex;
    }

    this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
  }

  /**
   * Describes the "Attribute value (unquoted) state".
   */
  attributeValueUnquotedState () {
    this._currentIndex++;
    this._currentEnd = this._currentIndex;
    var next;
    while (this._currentIndex < this._source.length) {
      // character reference in attribute value state is not supported
      next = this._source[this._currentIndex];

      if (WHITESPACE_TEST.test(next)) {
        this._currentState = HTMLTagTokenizer.STATES.BEFORE_ATTRIBUTE_NAME;
        return;
      }

      if (next === '>') {
        this._currentState = HTMLTagTokenizer.STATES.TAG_CLOSE;
        return;
      }

      if (next === '\u0000' ||
        next === '\'' ||
        next === '<' ||
        next === '=' ||
        next === '`') {
        this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
        return;
      }

      this._currentIndex++;
      this._currentEnd = this._currentIndex;
    }

    this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
  }

  /**
   * Describes the "After attribute value (quoted) state".
   */
  afterAttributeValueQuotedState () {
    this._currentIndex++;
    this._currentEnd = this._currentIndex;
    var next = this._source[this._currentIndex];

    if (WHITESPACE_TEST.test(next)) {
      this._currentState = HTMLTagTokenizer.STATES.BEFORE_ATTRIBUTE_NAME;
      return;
    }

    if (next === '/') {
      this._currentState = HTMLTagTokenizer.STATES.SELF_CLOSING_START_TAG_STATE;
      return;
    }

    if (next === '>') {
      this._currentState = HTMLTagTokenizer.STATES.TAG_CLOSE;
      return;
    }

    this._currentState = HTMLTagTokenizer.STATES.ILLEGAL;
  }

  static STATES = {
    ILLEGAL: -1,
    NO: 0,
    TAG_OPEN: 1,
    TAG_NAME: 2,
    BEFORE_ATTRIBUTE_NAME: 3,
    ATTRIBUTE_NAME: 4,
    AFTER_ATTRIBUTE_NAME: 5,
    BEFORE_ATTRIBUTE_VALUE: 6,
    ATTRIBUTE_VALUE_DOUBLE_QUOTED: 7,
    ATTRIBUTE_VALUE_SINGLE_QUOTED: 8,
    ATTRIBUTE_VALUE_UNQUOTED: 9,
    AFTER_ATTRIBUTE_VALUE_QUOTED: 10,
    SELF_CLOSING_START_TAG_STATE: 11,
    TAG_CLOSE: 12
  }
}

module.exports = HTMLTagTokenizer;
