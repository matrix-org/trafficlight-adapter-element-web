FROM node:16

WORKDIR /app

COPY . /app


RUN yarn install

RUN yarn tsc 

ENV CYPRESS_BASE_URL "https://app.element.io"

ENTRYPOINT ["node","bin/trafficlight.js","run"]

