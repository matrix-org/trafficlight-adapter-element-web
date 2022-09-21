FROM node:16

WORKDIR /app

COPY . /app


RUN yarn install

ENV CYPRESS_BASE_URL "https://app.element.io"

ENTRYPOINT ["yarn", "test:trafficlight"]

