FROM node:20-slim as builder
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

USER node
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm i

COPY --chown=node:node . .

EXPOSE 4000
CMD [ "npm","run","start:dev"]

