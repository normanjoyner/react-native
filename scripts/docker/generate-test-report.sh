#!/bin/bash

TEST_REPORT_DIR="${TEST_REPORT_DIR:-/tmp}"

mkdir -p $TEST_REPORT_DIR/junit/
find . -type f -regex ".*/build/test-results/debug/.*xml" -exec cp {} $TEST_REPORT_DIR/junit/ \;
find . -type f -regex ".*/outputs/androidTest-results/connected/.*xml" -exec cp {} $TEST_REPORT_DIR/junit/ \;
