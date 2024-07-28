# base stage to have npm installed
FROM node:20-alpine3.18 AS base

# development stage
#FROM base AS development
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Add an env to save ARG
CMD ["npm","run","start:dev"]
