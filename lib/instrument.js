'use strict';

module.exports = function instrument(file, instrumenter, cb) {
  instrumenter.instrument(
    file.contents.toString(),
    file.path,
    cb
  );
};
