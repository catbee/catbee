class ComponentAsync {
  render () {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(this.$context);
      }, 1);
    });
  }
}

module.exports = ComponentAsync;
