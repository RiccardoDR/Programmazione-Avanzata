import { Response } from 'express';
import HttpStatusCode from '../utils/status_code';
import Messages from '../utils/messages';

interface GoodResponse {
  code: number;
  status: string;
  message: string | JSON;
}

export enum ResponseType {
  CREATED,
  DELETED,
  UPDATED,
  UPLOADED,
  FAILED,
  ABORTED,
  RUNNING,
  PENDING,
  RECHARGED,
}

export class ResponseFactory {
  private responseMap: Record<ResponseType, GoodResponse> = {
    [ResponseType.CREATED]: {
      code: HttpStatusCode.CREATED,
      status: ResponseType[ResponseType.CREATED],
      message: Messages.UPLOAD_DATASET,
    },
    [ResponseType.DELETED]: {
      code: HttpStatusCode.OK,
      status: ResponseType[ResponseType.DELETED],
      message: Messages.DATASET_DELETED,
    },
    [ResponseType.UPDATED]: {
      code: HttpStatusCode.OK,
      status: ResponseType[ResponseType.UPDATED],
      message: Messages.DATASET_UPDATED,
    },
    [ResponseType.UPLOADED]: {
      code: HttpStatusCode.OK,
      status: ResponseType[ResponseType.UPLOADED],
      message: Messages.FILE_UPLOADED,
    },
    [ResponseType.FAILED]: {
      code: HttpStatusCode.OK,
      status: ResponseType[ResponseType.FAILED],
      message: Messages.FAILED,
    },
    [ResponseType.ABORTED]: {
      code: HttpStatusCode.OK,
      status: ResponseType[ResponseType.ABORTED],
      message: Messages.ABORTED,
    },
    [ResponseType.RUNNING]: {
      code: HttpStatusCode.ACCEPTED,
      status: ResponseType[ResponseType.RUNNING],
      message: Messages.RUNNING,
    },
    [ResponseType.PENDING]: {
      code: HttpStatusCode.ACCEPTED,
      status: ResponseType[ResponseType.PENDING],
      message: Messages.PENDING,
    },
    [ResponseType.RECHARGED]: {
      code: HttpStatusCode.OK,
      status: ResponseType[ResponseType.RECHARGED],
      message: Messages.RECHARGED,
    },
  };

  getResponse(type: ResponseType): GoodResponse {
    return this.responseMap[type];
  }

  send(res: Response, type?: ResponseType, data?: any | Messages): void {
    if (type !== undefined) {
      const { code, status, message } = this.getResponse(type);
      res.status(code).json({ status, message });
      return;
    }
    res.status(HttpStatusCode.OK).json(data);
    return;
  }
}
