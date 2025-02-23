import { NestFactory } from '@nestjs/core';
import { RmqOptions } from '@nestjs/microservices';
import configs from './utils/configs/configs';
import { AppModule } from './app.module';
import { getConsumerConfig } from 'rox-custody_common-modules/libs/config/rmq.config';
import { CustodyLogger } from 'rox-custody_common-modules/libs/services/logger/custody-logger.service';
import { setupNeededConstants } from 'rox-custody_common-modules/libs/utils/setup-needed-constants';


async function bootstrap() {
  setupNeededConstants({ projectName: 'PS' });

  const app = await NestFactory.create(AppModule);

  const logger = app.get(CustodyLogger);

  app.useLogger(logger)

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


