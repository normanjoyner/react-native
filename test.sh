#!/bin/bash

# set -ex

emulator64-arm -avd testAVD -no-skin -no-audio -no-window &
source scripts/circle-ci-android-setup.sh && waitForAVD
export PATH=$PATH:/home/ubuntu/buck/bin/

# for buck gen
mount -o remount,exec /dev/shm

# build app
buck build ReactAndroid/src/main/java/com/facebook/react
buck build ReactAndroid/src/main/java/com/facebook/react/shell

# compile native libs with Gradle script, we need bridge for unit and
# integration tests
./gradlew :ReactAndroid:packageReactNdkLibsForBuck -Pjobs=1 -Pcom.android.build.threadPoolSize=1

# unit tests
buck test ReactAndroid/src/test/... --config build.threads=1

# integration tests
# build JS bundle for instrumentation tests
REACT_NATIVE_MAX_WORKERS=1 node local-cli/cli.js bundle --platform android --dev true --entry-file ReactAndroid/src/androidTest/js/TestBundle.js --bundle-output ReactAndroid/src/androidTest/assets/AndroidTestBundle.js

# build test APK
/home/ubuntu/buck/bin/buck install ReactAndroid/src/androidTest/buck-runner:instrumentation-tests --config build.threads=1

# run installed apk with tests
node ./scripts/run-android-ci-instrumentation-tests.js --retries 3 --path ./ReactAndroid/src/androidTest/java/com/facebook/react/tests --package com.facebook.react.tests
