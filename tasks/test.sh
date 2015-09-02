#!/usr/bin/env bash

# test in node env
node_modules/.bin/jasmine;
TEST_NODE=$?;

# test with karma in phantomjs env
#node_modules/.bin/karma start spec/karma/karma.conf.js;
#TEST_BROWSER=$?;
TEST_BROWSER=0;

# return with good error code
if [ $TEST_NODE -eq 0 ] && [ $TEST_BROWSER -eq 0 ]
then
  echo "It Saul Goodman !";
  exit 0;
else
  exit 1;
fi
