# start crossbar
docker build -t wsocket-crossbar-test spec/crossbar;
docker run -d \
  --name wsocket-crossbar-test \
  -p 0.0.0.0:8080:8080 \
  -p 0.0.0.0:8081:8081 \
  wsocket-crossbar-test;
sleep 5;
