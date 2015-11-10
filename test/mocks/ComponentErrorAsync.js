class ComponentErrorAsync {
  render () {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error(this.$context.name));
      }, 1);
    });
  }
}

module.exports = ComponentErrorAsync;
