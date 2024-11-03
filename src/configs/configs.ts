import * as dotenv from 'dotenv';
import * as process from 'process';
dotenv.config();


export default {
  // general
  NODE_ENV: process.env.NODE_ENV,

  // database
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_NAME: process.env.DATABASE_NAME,
  DATABASE_USER: process.env.DATABASE_USER,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
  DATABASE_PORT: process.env.DATABASE_PORT,

  RABBITMQ_URL: process.env.RABBITMQ_URL,
  RABBITMQ_CUSTODY_PRIVATE_SERVER_QUEUE_NAME: process.env.RABBITMQ_CUSTODY_PRIVATE_SERVER_QUEUE_NAME,
};
