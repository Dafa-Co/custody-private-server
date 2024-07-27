import 'dotenv/config';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger: Logger;
  constructor() {
    this.logger = new Logger();
  }
  catch(exception: HttpException, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    console.log('exception', exception);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException
        ? exception.message || exception.message['error']
        : 'Internal server error';

    const devErrorResponse: any = {
      status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      source: request.constructor.name,
      errorName: exception?.name,
      message: exception?.message,
    };

    const prodErrorResponse: any = {
      status,
      message,
    };

    const responseData =
      process.env.NODE_ENV === 'DEVELOPMENT'
        ? devErrorResponse
        : prodErrorResponse;

    this.#writeToLog(request, exception, status);

    this.logger.log(
      `request method: ${request.method} request url${request.url}`,
      JSON.stringify(responseData),
    );


    const errors = exception instanceof HttpException
    ? exception['response']: { error: 'internal server error'} ;


    response.status(status).json({
      status,
      message,
      errors
    });
  }

  #writeToLog(request, exception, status) {
    const data = {
      url: request.url,
      method: request.method,
      req_body: request.body,
      code: status,
      message: exception.message,
      user_id: request.user?.id,
      timestamp: new Date().toISOString(),
    };

  }
}
