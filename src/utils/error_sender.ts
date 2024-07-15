import { Response } from 'express';
import { CustomError } from '../factory/errFactory';
import HttpStatusCode from './status_code';

class ErrorSender {
  send(res: Response, err: CustomError | Error): void {
    if (err instanceof CustomError)
      res.status(err.code).json({ type: err.name, message: err.message });
    else
      res
        .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
        .json({ type: err.name, message: err.message });
    return;
  }
}

export default ErrorSender;
