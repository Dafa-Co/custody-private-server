import { NestFactory } from '@nestjs/core';
import { RmqOptions } from '@nestjs/microservices';
import configs from './utils/configs/configs';
import { AppModule } from './app.module';
import { getConsumerConfig } from 'rox-custody_common-modules/libs/config/rmq.config';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Create RabbitMQ microservice
  app.connectMicroservice<RmqOptions>(
    getConsumerConfig({
      clusterUrl: configs.RABBITMQ_URL,
      queueName: configs.RABBITMQ_CUSTODY_PRIVATE_SERVER_QUEUE_NAME,
    })
  );

  app.startAllMicroservices()

  await app.init();
}
bootstrap();


