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
//https://github.com/shelljs/shelljs/issues/51
//require('shelljs/global');

const argv = require('yargs').argv;
const child_process = require('child_process');

// ReactAndroid/src/androidTest/java/com/facebook/react/tests/ReactHorizontalScrollViewTestCase.java
/*
const testClasses = ls(`${argv.path}/*.java`)
.map(javaFile => {
  // ReactHorizontalScrollViewTestCase
  return path.basename(javaFile, '.java');
}).map(className => {
  // com.facebook.react.tests.ReactHorizontalScrollViewTestCase
  return argv.package + '.' + className;
});
*/

const testClasses = [ 'com.facebook.react.tests.CatalystMeasureLayoutTest',
  'com.facebook.react.tests.CatalystMultitouchHandlingTestCase',
  'com.facebook.react.tests.CatalystNativeJSToJavaParametersTestCase',
  'com.facebook.react.tests.CatalystNativeJavaToJSArgumentsTestCase',
  'com.facebook.react.tests.CatalystSubviewsClippingTestCase',
  'com.facebook.react.tests.CatalystTouchBubblingTestCase',
  'com.facebook.react.tests.CatalystUIManagerTestCase',
  'com.facebook.react.tests.DatePickerDialogTestCase',
  'com.facebook.react.tests.InitialPropsTestCase',
  'com.facebook.react.tests.JSLocaleTest',
  'com.facebook.react.tests.JSResponderTestCase',
  'com.facebook.react.tests.LayoutEventsTestCase',
  'com.facebook.react.tests.ProgressBarTestCase',
  'com.facebook.react.tests.ReactHorizontalScrollViewTestCase',
  'com.facebook.react.tests.ReactPickerTestCase',
  'com.facebook.react.tests.ReactRootViewTestCase',
  'com.facebook.react.tests.ReactScrollViewTestCase',
  'com.facebook.react.tests.ReactSwipeRefreshLayoutTestCase',
  'com.facebook.react.tests.ShareTestCase',
  'com.facebook.react.tests.TestIdTestCase',
  'com.facebook.react.tests.TextInputTestCase',
  'com.facebook.react.tests.TimePickerDialogTestCase',
  'com.facebook.react.tests.ViewRenderingTestCase' ];

let exitCode = 0;
testClasses.forEach((testClass) => {
    child_process.exec(`./scripts/run-instrumentation-tests-via-adb-shell.sh ${argv.package} ${testClass}`, (err, stderr, stdout) => {
        console.log(err);
        console.log(stderr);
        console.log(stdout);
    });
});

/*eslint-enable no-undef */
