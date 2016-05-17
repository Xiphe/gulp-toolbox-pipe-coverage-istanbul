'use strict';

const meta = require('./package');
const through2 = require('through2');
const File = require('vinyl');
const path = require('path');
const cwd = process.cwd();

const getReporter = require('./lib/getReporter');
const bindReporter = require('./lib/bindReporter');
const bindCleanup = require('./lib/bindCleanup');
const hookRequire = require('./lib/hookRequire');
const instrument = require('./lib/instrument');

module.exports = {
  name: 'coverage:istanbul',
  meta,
  config: {
    'coverage.enabled': {
      default: true,
    },
  },
  get(helper) {
    const config = helper.getConfig();

    if (!config.coverage.enabled) {
      return false;
    }

    const coverageVariable = `$$gtb_cov_${new Date().getTime()}$$`;
    const istanbul = require('istanbul'); // eslint-disable-line global-require
    const instrumentLib = {};
    const instrumenter = new istanbul.Instrumenter({
      coverageVariable,
    });

    bindReporter(
      helper,
      getReporter(
        istanbul.Collector,
        coverageVariable,
        istanbul.Reporter,
        helper
      )
    );

    bindCleanup(helper);

    hookRequire(istanbul.hook, instrumentLib);

    return through2.obj(
      (file, __, cb) => {
        instrument(file, instrumenter, (err, contents) => {
          if (err) {
            return cb(err);
          }

          instrumentLib[path.relative(cwd, file.path)] = contents;

          return cb(null, new File({
            cwd: file.cwd,
            base: file.base,
            path: file.path,
            contents: new Buffer(contents, 'utf8'),
          }));
        });
      }
    );
  },
};
