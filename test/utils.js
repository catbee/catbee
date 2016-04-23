module.exports = {
  wait: (milliseconds) => new Promise(fulfill => setTimeout(() => fulfill(), milliseconds)),

  click: (element, options) => {
    const event = new options.view.MouseEvent('click', options);
    element.dispatchEvent(event);
  }
};
