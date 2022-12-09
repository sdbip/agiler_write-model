import { IncomingMessage } from 'http'
import { Response } from './response.js'

export function readResponse(response: IncomingMessage) {
  return new Promise<Response>((resolve) => {
    let result = ''
    response.setEncoding('utf-8')
    response.on('data', (content) => {
      result += content
    })
    response.on('end', () => {
      resolve({
        statusCode: response.statusCode,
        content: result,
      } as Response)
    })
  })
}
