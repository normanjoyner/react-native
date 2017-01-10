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

# solve issue with max user watches limit
echo 65536 | tee -a /proc/sys/fs/inotify/max_user_watches
watchman shutdown-server

# integration tests
# build JS bundle for instrumentation tests
node local-cli/cli.js bundle --platform android --dev true --entry-file ReactAndroid/src/androidTest/js/TestBundle.js --bundle-output ReactAndroid/src/androidTest/assets/AndroidTestBundle.js

# build test APK
buck install ReactAndroid/src/androidTest/buck-runner:instrumentation-tests --config build.threads=1

# run installed apk with tests
node ./scripts/docker/run-android-ci-instrumentation-tests.js $*
