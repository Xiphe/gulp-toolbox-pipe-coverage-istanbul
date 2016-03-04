'use strict';

const meta = require('./package');
const through2 = require('through2');
const File = require('vinyl');
const path = require('path');
const tmp = require('tmp');
const cwd = process.cwd();

tmp.setGracefulCleanup();

let unbindPreviousReporter = null;

function getReporter(Collector, coverageVariable, Reporter, helper) {
  return (data, next) => {
    tmp.dir({ unsafeCleanup: true }, (err, tmpPath) => {
      if (err) {
        return next(err);
      }

      const collector = new Collector();
      const reporter = new Reporter(null, tmpPath);
      reporter.addAll(['lcov', 'text-summary']);

      collector.add(global[coverageVariable] || {});
      return reporter.write(collector, false, (writeErr) => {
        if (writeErr) {
          return next(writeErr);
        }

        return helper.emit(
          'done:report:coverage:istanbul',
          { path: tmpPath },
          next
        );
      });
    });
  };
}

function bindReporter(helper, reporter) {
  if (typeof unbindPreviousReporter === 'function') {
    unbindPreviousReporter();
  }

  helper.on('report:coverage:istanbul', reporter);
  unbindPreviousReporter = () => {
    helper.removeListener('report:coverage:istanbul', reporter);
  };
}

function hookRequire(hook, lib) {
  const matcher = (file) => !!lib[path.relative(cwd, file)];

  hook.hookRequire(
    matcher,
    (__, file) => lib[path.relative(cwd, file)]
  );

  hook.unloadRequireCache(matcher);
}

function instrument(file, instrumenter, cb) {
  instrumenter.instrument(
    file.contents.toString(),
    file.path,
    cb
  );
}

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
    const istanbul = require('istanbul');
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
