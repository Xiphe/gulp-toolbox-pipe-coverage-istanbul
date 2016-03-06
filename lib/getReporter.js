'use strict';

const chalk = require('chalk');
const logger = require('gulplog');
const getTmpDir = require('./getTmpDir');

module.exports = function getReporter(Collector, coverageVariable, Reporter, helper) {
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
};
