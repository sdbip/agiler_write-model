import express from 'express'
import { createServer, Server as HTTPServer } from 'http'

export type Request = express.Request
export type Handler = (request: Request) => Promise<string | object>
export interface Response {
  statusCode?: number
  content?: string | object
}
interface NormalizedResponse {
  statusCode: number
  content: string
}
export interface ServerSetup {
  get(path: string, handler: Handler): void
  post(path: string, handler: Handler): void
  patch(path: string, handler: Handler): void
  finalize(): Server
  public(root: string): void
}

export const NOT_FOUND: Response = { statusCode: 404 }

export const setupServer = (): ServerSetup => {
  const app = express()

  function wrapHandler(handler: Handler) {
    return async (request: express.Request, response: express.Response) => {
      const result = await callHandler(request)
      outputResult(response, toResponse(result))
    }

    async function callHandler(request: Request) {
      try {
        return await handler(request)
      } catch (thrown) {
        const { message } = thrown as Error
        const error = { message }
        return {
          statusCode: 500,
          content: { error },
        }
      }
    }

    function toResponse(result: string | object): NormalizedResponse {
      if (typeof result === 'string') return {
        statusCode: 200,
        content: result,
      }

      const responseData = result as Response
      return {
        statusCode: responseData.statusCode ?? 200,
        content: typeof responseData.content === 'string'
          ? responseData.content
          : JSON.stringify('content' in responseData
            ? responseData.content
            : responseData),
      }
    }

    function outputResult(response: express.Response, result: NormalizedResponse) {
      const responseData = result as Response
      response.statusCode = responseData?.statusCode ?? 200

      response.end(result.content)
    }
  }

  return {
    public: (root: string) => {
      app.use('/public', express.static(root, {}))
    },
    get: (path: string, handler: Handler) => {
      app.get(path, wrapHandler(handler))
    },
    post: (path: string, handler: Handler) => {
      app.post(path, wrapHandler(handler))
    },
    patch: (path: string, handler: Handler) => {
      app.patch(path, wrapHandler(handler))
    },
    finalize: () => new Server(app),
  }
}

export class Server {
  private app: express.Express
  private server?: HTTPServer

  constructor(app: express.Express) {
    this.app = app
  }

  listenAtPort(port: number) {
    if (!port) throw new Error('called without port number')
    
    this.server = createServer(this.app)
    this.server.listen(port)
  }

  stopListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return reject('no server started')
      this.server.close((error) => {
        if (error) return reject(error)
  
        resolve()
      })
    })
  }
}
