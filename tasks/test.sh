#!/usr/bin/env bash

# start crossbar
docker build -t wsocket-crossbar-test spec/crossbar;
docker run -d \
  --name wsocket-crossbar-test \
  -p 0.0.0.0:8080:8080 \
  -p 0.0.0.0:8081:8081 \
  wsocket-crossbar-test;
sleep 5;

# test in node env
node_modules/.bin/jasmine;
TEST_NODE=$?;

# test with karma in phantomjs env
#node_modules/.bin/karma start spec/karma/karma.conf.js;
#TEST_BROWSER=$?;
TEST_BROWSER=0;

# stop/clean crossbar
docker stop wsocket-crossbar-test;
docker rm wsocket-crossbar-test;
docker rmi wsocket-crossbar-test;

# return with good error code
if [ $TEST_NODE -eq 0 ] && [ $TEST_BROWSER -eq 0 ]
then
  echo "It Saul Goodman !";
  exit 0;
else
  exit 1;
fi
