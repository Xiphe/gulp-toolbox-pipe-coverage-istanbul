'use strict';

const del = require('del');
const getTmpDir = require('./getTmpDir');

let cleanupBound = null;

module.exports = function bindCleanup(helper) {
  if (cleanupBound) {
    return;
  }

  helper.on('cleanup', () => {
    if (getTmpDir.tmpDir) {
      del.sync([getTmpDir.tmpDir], { force: true });
    }
  });
  cleanupBound = true;
};
