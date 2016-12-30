#!/bin/bash

# for buck gen
mount -o remount,exec /dev/shm

set -x

# unit tests
buck test ReactAndroid/src/test/... --config build.threads=1
