FROM cypress/base:16

WORKDIR /app
COPY . /app

RUN yarn install
RUN yarn tsc
RUN yarn cypress install
RUN chmod -R o+rwx /root/.cache/
RUN ln -s /root/.cache /.cache
ENV CYPRESS_BASE_URL "https://app.element.io"
CMD ["node","bin/trafficlight.js","run"]

