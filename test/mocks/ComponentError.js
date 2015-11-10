class ComponentError {
  render () {
    throw new Error(this.$context.name);
  }
}

module.exports = ComponentError;
