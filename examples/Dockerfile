FROM ubuntu:22.04
RUN apt-get update \
    && apt-get install iputils-ping nano curl -y

ENTRYPOINT ["/bin/ping"]
CMD ["google.com"]
