import * as Joi from 'joi';
import * as dotenv from 'dotenv';

dotenv.config();

const JoiNumberCasting = Joi.alternatives().try(
  Joi.number(),
  Joi.string()
    .regex(/^\d+$/)
    .custom((value) => Number(value)),
);

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('DEV', 'TEST', 'DEMO', 'PROD').required(),

  // Database configuration
  DATABASE_HOST: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_PORT: JoiNumberCasting.required(),

  // RabbitMQ configuration
  RABBITMQ_URL: Joi.string().required(),
  RABBITMQ_CUSTODY_PRIVATE_SERVER_QUEUE_NAME: Joi.string().required(),
}).strict(); // Ensure only specified keys are allowed

export default envVarsSchema;
