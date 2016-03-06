'use strict';

const meta = require('./package');
const through2 = require('through2');
const File = require('vinyl');
const path = require('path');
const chalk = require('chalk');
const del = require('del');
const logger = require('gulplog');
const tmp = require('tmp');
const cwd = process.cwd();

let unbindPreviousReporter = null;
let theTmpDir = null;
let cleanupBound = null;

function getTmpDir(cb) {
  if (theTmpDir) {
    del([path.join(theTmpDir, '**')], { force: true })
      .then(() => cb(null, theTmpDir), cb);
    return;
  }

  tmp.dir((err, aTmpDir) => {
    if (err) {
      return cb(err);
    }

    theTmpDir = aTmpDir;
    return cb(null, aTmpDir);
  });
}

function getReporter(Collector, coverageVariable, Reporter, helper) {
  return (data, next) => {
    getTmpDir((err, tmpDir) => {
      if (err) {
        return next(err);
      }

      const collector = new Collector();
      const reporter = new Reporter(null, tmpDir);
      reporter.addAll(['lcov', 'text-summary']);

      collector.add(global[coverageVariable] || {});
      return reporter.write(collector, false, (writeErr) => {
        if (writeErr) {
          return next(writeErr);
        }

        logger.info('Detailed coverage report available here:');
        logger.info(chalk.blue(`file://${tmpDir}/lcov-report/index.html`));

        return helper.emit(
          'done:report:coverage:istanbul',
          { path: tmpDir },
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

function bindCleanup(helper) {
  if (cleanupBound) {
    return;
  }

  helper.on('cleanup', () => {
    if (theTmpDir) {
      del.sync([theTmpDir], { force: true });
    }
  });
  cleanupBound = true;
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
