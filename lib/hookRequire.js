'use strict';

const path = require('path');
const cwd = process.cwd();

module.exports = function hookRequire(hook, lib) {
  const matcher = (file) => !!lib[path.relative(cwd, file)];

  function unloadCache() {
    hook.unloadRequireCache(matcher);
  }

  hook.hookRequire(
    matcher,
    (__, file) => lib[path.relative(cwd, file)]
  );

  return unloadCache;
};
