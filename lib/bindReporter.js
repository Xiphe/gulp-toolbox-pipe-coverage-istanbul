'use strict';

let unbindPreviousReporter = null;

module.exports = function bindReporter(helper, reporter) {
  if (typeof unbindPreviousReporter === 'function') {
    unbindPreviousReporter();
  }

  helper.on('report:coverage:istanbul', reporter);
  unbindPreviousReporter = () => {
    helper.removeListener('report:coverage:istanbul', reporter);
  };
};
