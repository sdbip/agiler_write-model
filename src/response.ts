export enum StatusCode {
  OK = 200,
  Created = 201,
  NoContent = 204,
  NotFound = 404,
  InternalServerError = 500,
}

export interface Response {
  statusCode?: StatusCode | number
  content?: string | object
}

export const ResponseObject: { [_:string]: Response } = {
  NotFound: { statusCode: StatusCode.NotFound },
  NoContent: { statusCode: StatusCode.NoContent },
}
