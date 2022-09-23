FROM cypress/browsers

RUN chmod 775 /root

WORKDIR /app

COPY . /app
RUN yarn install
RUN yarn tsc
RUN yarn cypress install

ENV CYPRESS_BASE_URL "https://app.element.io"
ENV CYPRESS_CACHE_FOLDER "/root/.cache/Cypress"
CMD ["node","/app/bin/trafficlight.js","run"]

