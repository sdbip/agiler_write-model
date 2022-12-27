import { IncomingMessage, request } from 'http'
import { PORT } from '../src/config'

export function get(path: string) {
  return send({ method: 'GET', path })
}

export function patch(path: string, { authorization, body }: {authorization?: string, body?: Record<string, unknown>}) {
  return send({ method: 'PATCH', path, body, authorization: authorization })
}

export function post(path: string, { authorization, body }: {authorization?: string, body: Record<string, unknown>}) {
  return send({ method: 'POST', path, body, authorization: authorization })
}

function send({ method, path, body, authorization }: {method: string, path: string, body?: Record<string, unknown>, authorization?: string}) {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path,
    method,
    headers: {
      ...authorization && { 'Authorization': authorization },
      'Content-Type': 'application/json',
      'Content-Length': body ? JSON.stringify(body).length : 0,
    },
  }

  return new Promise<Response>((resolve) => {
    const rq = request(options, async response => {
      const result = await readResponse(response)
      resolve(result)
    })

    rq.end(body ? JSON.stringify(body) : undefined)
  })
}

export type Response = {
  statusCode: number
  content: string
}

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
