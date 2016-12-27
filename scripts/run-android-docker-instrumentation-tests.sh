#!/bin/bash

# for buck gen
mount -o remount,exec /dev/shm

# emulator setup
emulator64-arm -avd testAVD -no-skin -no-audio -no-window -no-boot-anim &
bootanim=""
until [[ "$bootanim" =~ "stopped" ]]; do
    sleep 5
    bootanim=$(adb -e shell getprop init.svc.bootanim 2>&1)
    echo "boot animation status=$bootanim"
done

set -x

# unit tests
buck test ReactAndroid/src/test/... --config build.threads=1

# integration tests
# build JS bundle for instrumentation tests
node local-cli/cli.js bundle --platform android --dev true --entry-file ReactAndroid/src/androidTest/js/TestBundle.js --bundle-output ReactAndroid/src/androidTest/assets/AndroidTestBundle.js

# build test APK
buck install ReactAndroid/src/androidTest/buck-runner:instrumentation-tests --config build.threads=1

# run installed apk with tests
node ./scripts/run-android-ci-instrumentation-tests.js --retries 3 --path ./ReactAndroid/src/androidTest/java/com/facebook/react/tests --package com.facebook.react.tests
