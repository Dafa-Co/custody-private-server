FROM node:20-slim as builder

USER node
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm i

COPY --chown=node:node . .

EXPOSE 3000
CMD [ "npm","run","start:dev"]

