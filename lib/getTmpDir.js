'use strict';

const path = require('path');
const del = require('del');
const tmp = require('tmp');

function getTmpDir(cb) {
  if (getTmpDir.tmpDir) {
    del([path.join(getTmpDir.tmpDir, '**')], { force: true })
      .then(() => cb(null, getTmpDir.tmpDir), cb);
    return;
  }

  tmp.dir((err, aTmpDir) => {
    if (err) {
      return cb(err);
    }

    getTmpDir.tmpDir = aTmpDir;
    return cb(null, aTmpDir);
  });
}

module.exports = getTmpDir;
