FROM vinelab/crossbar
RUN mkdir -p /usr/local/bin/crossbar/.crossbar
COPY ./config.json /usr/local/bin/crossbar/.crossbar/config.json
WORKDIR /usr/local/bin/crossbar
CMD crossbar start
EXPOSE 8080 8081
