FROM cypress/browsers


WORKDIR /app

COPY . /app
RUN chmod 775 /app/ /app/cypress/ /app/cypress 

RUN yarn install
RUN yarn tsc
RUN yarn cypress install

RUN chmod 775 /root
RUN chown -R root:root /root/.cache/Cypress
RUN chmod 775 /root/.cache/Cypress/*
ENV CYPRESS_BASE_URL "https://app.element.io"
ENV CYPRESS_CACHE_FOLDER "/root/.cache/Cypress"
CMD ["node","/app/bin/trafficlight.js","run"]

