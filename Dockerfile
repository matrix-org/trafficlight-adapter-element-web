FROM cypress/browsers:node16.16.0-chrome105-ff99-edge


WORKDIR /app
COPY . /app

RUN yarn install
RUN yarn tsc

ENV CYPRESS_BASE_URL "https://app.element.io"

CMD ["node","bin/trafficlight.js","run"]

