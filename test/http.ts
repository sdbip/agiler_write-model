import { IncomingMessage, request } from 'http'
import { PORT } from '../src/config'

export function get(path: string) {
  return send({ method: 'GET', path })
}

export function patch(path: string, body?: Record<string, unknown>) {
  return send({ method: 'PATCH', path, body })
}

export function post(path: string, body: Record<string, unknown>) {
  return send({ method: 'POST', path, body })
}

function send({ method, path, body }: {method: string, path: string, body?: Record<string, unknown>}) {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path,
    method,
    headers: {
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
