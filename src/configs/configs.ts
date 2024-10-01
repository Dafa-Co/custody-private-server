import * as dotenv from 'dotenv';
import * as process from 'process';
dotenv.config();


export default {
  // general
  APP_NAME: process.env.APP_NAME || 'custody_super_admin',
  NODE_ENV: process.env.NODE_ENV || 'DEVELOPMENT',

  // database
  DATABASE_TYPE: process.env.DATABASE_TYPE || 'mysql',
  DATABASE_HOST: process.env.DATABASE_HOST || 'db',
  DATABASE_NAME: process.env.DATABASE_NAME || 'custody_admin_db',
  DATABASE_USER: process.env.DATABASE_USER || 'user',
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || '',
  DATABASE_PORT: process.env.DATABASE_PORT || '3306',

  RABBITMQ_URL: process.env.RABBITMQ_URL || 'qwe',
  RABBITMQ_CUSTODY_PRIVATE_SERVER_QUEUE_NAME: process.env.RABBITMQ_CUSTODY_PRIVATE_SERVER_QUEUE_NAME || 'service1',


};
