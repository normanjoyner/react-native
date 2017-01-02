/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

/**
 * This script runs instrumentation tests one by one with retries
 * Instrumentation tests tend to be flaky, so rerunning them individually increases
 * chances for success and reduces total average execution time.
 *
 * We assume that all instrumentation tests are flat in one folder
 * Available arguments:
 * --path - path to all .java files with tests
 * --package - com.facebook.react.tests
 * --retries [num] - how many times to retry possible flaky commands: npm install and running tests, default 1
 */
/*eslint-disable no-undef */

const argv = require('yargs').argv;
const async = require('async');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const testClasses = fs.readdirSync(path.resolve(process.cwd(), argv.path))
    .filter(function filter(clazz) {
        return clazz.endsWith('.java');
    })
    .map(function map(clazz) {
        return argv.package + '.' + clazz;
    });

// TODO: NICK TATE - add in support for retry flag
return async.eachSeries(testClasses, (clazz, callback) => {
    return child_process.exec(`./scripts/run-instrumentation-tests-via-adb-shell.sh ${argv.package} ${clazz}`, callback);
}, (err) => {
    if (err) {
        return process.exit(1);
    }

    return process.exit(0);
});

/*eslint-enable no-undef */
