#!/usr/bin/env node

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
 * This script tests that React Native end to end installation/bootstrap works for different platforms
 * Available arguments:
 * --ios - to test only ios application end to end
 * --tvos - to test only tvOS application end to end
 * --android - to test only android application end to end
 * --js - to test that JS in the application is compilable
 * --skip-cli-install - to skip react-native-cli global installation (for local debugging)
 * --retries [num] - how many times to retry possible flaky commands: npm install and running tests, default 1
 */
/*eslint-disable no-undef */

const argv = require('yargs').argv;
const child_process = require('child_process');
const path = require('path');

const SCRIPTS = __dirname;
const ROOT = path.normalize(path.join(__dirname, '..'));

let temp_result = child_process.spawnSync('mktemp', ['-d', '/tmp/react-native-XXXXXXXX']);

let TEMP;

if(temp_result.error || temp_result.status !== 0) {
  throw Error(temp_result.status);
} else {
  TEMP = temp_result.stdout.toString().trim();
}

// To make sure we actually installed the local version
// of react-native, we will create a temp file inside the template
// and check that it exists after `react-native init
let ios_marker_result = child_process.spawnSync('mktemp', [`${ROOT}/local-cli/templates/HelloWorld/ios/HelloWorld/XXXXXXXX`]);

let MARKER_IOS;

if(ios_marker_result.error || ios_marker_result.status !== 0) {
  throw Error(ios_marker_result.status);
} else {
  MARKER_IOS = ios_marker_result.stdout.toString().trim();
}

let android_marker_result = child_process.spawnSync('mktemp', [`${ROOT}/local-cli/templates/HelloWorld/android/XXXXXXXX`]);

let MARKER_ANDROID;

if(android_marker_result.error || android_marker_result.status !== 0) {
  throw Error(android_marker_result.status);
} else {
  MARKER_ANDROID = android_marker_result.stdout.toString().trim();
}

let SERVER_PID;
let APPIUM_PID;
let exitCode;

try {
  // install CLI
  let npm_pack_result = child_process.spawnSync('npm', ['pack'], {
    cwd: `${ROOT}/react-native-cli`,
  });

  if(npm_pack_result.error || npm_pack_result.status !== 0) {
    throw Error(npm_pack_result.status);
  }

  const CLI_PACKAGE = path.join(ROOT, 'react-native-cli', 'react-native-cli-*.tgz');

  // can skip cli install for non sudo mode
  if (!argv['skip-cli-install']) {
    let npm_install_result = child_process.spawnSync('npm', ['install', '-g', CLI_PACKAGE]);

    if(npm_install_result.error || npm_install_result.status !== 0) {
      console.log('Could not install react-native-cli globally, please run in su mode');
      console.log('Or with --skip-cli-install to skip this step');
      throw Error(npm_install_result.status);
    }
  }

  if (argv.android) {
    let gradle_result = child_process.spawnSync('./gradlew', [':ReactAndroid:installArchives', '-Pjobs=1', '-Dorg.gradle.jvmargs="-Xmx512m -XX:+HeapDumpOnOutOfMemoryError"']);

    if(gradle_result.error || gradle_result.status !== 0) {
      console.log('Failed to compile Android binaries');
      throw Error(gradle_result.status);
    }
  }

  let npm_pack_2_result = child_process.spawnSync('npm', ['pack']);

  if(npm_pack_2_result.error || npm_pack_2_result.status !== 0) {
    console.log('Failed to pack react-native');
    throw Error(npm_pack_2_result.status);
  }

  const PACKAGE = path.join(ROOT, 'react-native-*.tgz');

  let result = child_process.spawnSync('react-native', ['init', 'EndToEndTest', '--version', PACKAGE, '--npm'], {
    cwd: TEMP
  });

  if(result.error || result.status !== 0) {
      console.log('Failed to execute react-native init');
      console.log('Most common reason is npm registry connectivity, try again');
      throw Error(result.status);
  }

  cd('EndToEndTest');

  if (argv.android) {
    console.log('Running an Android e2e test');
    console.log('Installing e2e framework');

    let result = child_process.spawnSync('npm', ['install', '--save-dev', 'appium@1.5.1', 'mocha@2.4.5', 'wd@0.3.11', 'colors@1.0.3', 'pretty-data2@0.40.1'], {
      cwd: `${TEMP}/EndToEndTest`
    });

    if(result.error || result.status !== 0) {
      console.log('Failed to install appium');
      console.log('Most common reason is npm registry connectivity, try again');
      throw Error(result.status);
    }

    cp(`${SCRIPTS}/android-e2e-test.js`, 'android-e2e-test.js');
    cd('android');
    console.log('Downloading Maven deps');
    exec('./gradlew :app:copyDownloadableDepsToLibs');
    // Make sure we installed local version of react-native
    if (!test('-e', path.basename(MARKER_ANDROID))) {
      console.log('Android marker was not found, react native init command failed?');
      exitCode = 1;
      throw Error(exitCode);
    }
    cd('..');
    exec('keytool -genkey -v -keystore android/keystores/debug.keystore -storepass android -alias androiddebugkey -keypass android -dname "CN=Android Debug,O=Android,C=US"');

    console.log(`Starting packager server, ${SERVER_PID}`);
    const appiumProcess = child_process.spawn('node', ['./node_modules/.bin/appium']);
    APPIUM_PID = appiumProcess.pid;
    console.log(`Starting appium server, ${APPIUM_PID}`);
    console.log('Building app');
    if (exec('buck build android/app').code) {
      console.log('could not execute Buck build, is it installed and in PATH?');
      exitCode = 1;
      throw Error(exitCode);
    }
    const packagerEnv = Object.create(process.env);
    packagerEnv.REACT_NATIVE_MAX_WORKERS = 1;
    // shelljs exec('', {async: true}) does not emit stdout events, so we rely on good old child_process.spawn
    const packagerProcess = child_process.spawn('npm', ['start'], {
      // stdio: 'inherit',
      env: packagerEnv
    });
    SERVER_PID = packagerProcess.pid;
    // wait a bit to allow packager to startup
    exec('sleep 15s');
    console.log('Executing android e2e test');
    if (tryExecNTimes(
      () => {
        exec('sleep 10s');
        return exec('node node_modules/.bin/_mocha android-e2e-test.js').code;
      },
      numberOfRetries)) {
        console.log('Failed to run Android e2e tests');
        console.log('Most likely the code is broken');
        exitCode = 1;
        throw Error(exitCode);
    }
  }

  if (argv.ios || argv.tvos) {
    var iosTestType = (argv.tvos ? 'tvOS' : 'iOS');
    console.log('Running the ' + iosTestType + 'app');
    cd('ios');
    // Make sure we installed local version of react-native
    if (!test('-e', path.join('EndToEndTest', path.basename(MARKER_IOS)))) {
      console.log('iOS marker was not found, `react-native init` command failed?');
      exitCode = 1;
      throw Error(exitCode);
    }
    // shelljs exec('', {async: true}) does not emit stdout events, so we rely on good old child_process.spawn
    const packagerEnv = Object.create(process.env);
    packagerEnv.REACT_NATIVE_MAX_WORKERS = 1;
    const packagerProcess = child_process.spawn('npm', ['start', '--', '--nonPersistent'],
      {
        stdio: 'inherit',
        env: packagerEnv
      });
    SERVER_PID = packagerProcess.pid;
    exec('sleep 15s');
    // prepare cache to reduce chances of possible red screen "Can't fibd variable __fbBatchedBridge..."
    exec('response=$(curl --write-out %{http_code} --silent --output /dev/null localhost:8081/index.ios.bundle?platform=ios&dev=true)');
    console.log(`Starting packager server, ${SERVER_PID}`);
    console.log('Executing ' + iosTestType + ' e2e test');
    if (tryExecNTimes(
      () => {
        exec('sleep 10s');
        if (argv.tvos) {
          return exec('xcodebuild -destination "platform=tvOS Simulator,name=Apple TV 1080p,OS=10.0" -scheme EndToEndTest-tvOS -sdk appletvsimulator test | xcpretty && exit ${PIPESTATUS[0]}').code;
        } else {
          return exec('xcodebuild -destination "platform=iOS Simulator,name=iPhone 5s,OS=10.0" -scheme EndToEndTest -sdk iphonesimulator test | xcpretty && exit ${PIPESTATUS[0]}').code;
        }
      },
      numberOfRetries)) {
        console.log('Failed to run ' + iosTestType + ' e2e tests');
        console.log('Most likely the code is broken');
        exitCode = 1;
        throw Error(exitCode);
    }
    cd('..');
  }

  if (argv.js) {
    // Check the packager produces a bundle (doesn't throw an error)
    if (exec('REACT_NATIVE_MAX_WORKERS=1 react-native bundle --platform android --dev true --entry-file index.android.js --bundle-output android-bundle.js').code) {
      console.log('Could not build Android bundle');
      exitCode = 1;
      throw Error(exitCode);
    }
    if (exec('REACT_NATIVE_MAX_WORKERS=1 react-native bundle --platform ios --dev true --entry-file index.ios.js --bundle-output ios-bundle.js').code) {
      console.log('Could not build iOS bundle');
      exitCode = 1;
      throw Error(exitCode);
    }
    if (exec(`${ROOT}/node_modules/.bin/flow check`).code) {
      console.log('Flow check does not pass');
      exitCode = 1;
      throw Error(exitCode);
    }
    if (exec('npm test').code) {
      console.log('Jest test failure');
      exitCode = 1;
      throw Error(exitCode);
    }
  }
  exitCode = 0;

} finally {
  cd(ROOT);
  rm(MARKER_IOS);
  rm(MARKER_ANDROID);

  if (SERVER_PID) {
    console.log(`Killing packager ${SERVER_PID}`);
    exec(`kill -9 ${SERVER_PID}`);
    // this is quite drastic but packager starts a daemon that we can't kill by killing the parent process
    // it will be fixed in April (quote David Aurelio), so until then we will kill the zombie by the port number
    exec("lsof -i tcp:8081 | awk 'NR!=1 {print $2}' | xargs kill");
  }
  if (APPIUM_PID) {
    console.log(`Killing appium ${APPIUM_PID}`);
    exec(`kill -9 ${APPIUM_PID}`);
  }
}
exit(exitCode);

/*eslint-enable no-undef */
