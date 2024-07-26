import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RmqOptions, Transport } from '@nestjs/microservices';
import configs from './utils/configs/configs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


    // Create RabbitMQ microservice
    app.connectMicroservice<RmqOptions>({
      transport: Transport.RMQ, // Set transport to RabbitMQ
      options: {
        urls: [configs.RABBITMQ_URL], // RabbitMQ connection URL
        queue: configs.RABBITMQ_CUSTODY_PRIVATE_SERVER_QUEUE_NAME, // Queue name
        queueOptions: {
          durable: true, // Make sure that the queue is durable
        },
      },
    });



  await app.init();
  await app.listen(3000);
}
bootstrap();
