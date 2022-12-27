import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { StatusCode } from './response.js';
export const setupServer = () => {
    const app = express();
    app.use(cors());
    function wrapHandler(handler) {
        return async (request, response) => {
            const result = await callHandler(request);
            outputResult(response, toResponse(result));
        };
        async function callHandler(request) {
            try {
                return await handler(request);
            }
            catch (thrown) {
                const { message } = thrown;
                const error = { message };
                return {
                    statusCode: StatusCode.InternalServerError,
                    content: { error },
                };
            }
        }
        function toResponse(result) {
            if (typeof result === 'string')
                return {
                    statusCode: StatusCode.OK,
                    content: result,
                };
            const responseData = result;
            return {
                statusCode: responseData.statusCode ?? StatusCode.OK,
                content: typeof responseData.content === 'string'
                    ? responseData.content
                    : JSON.stringify('content' in responseData
                        ? responseData.content
                        : responseData),
            };
        }
        function outputResult(response, result) {
            const responseData = result;
            response.statusCode = responseData?.statusCode ?? StatusCode.OK;
            response.setHeader('Content-Type', 'application/json');
            response.end(result.content);
        }
    }
    return {
        public: (root) => {
            app.use('/public', express.static(root, {}));
        },
        get: (path, handler) => {
            app.get(path, wrapHandler(handler));
        },
        post: (path, handler) => {
            app.post(path, wrapHandler(handler));
        },
        patch: (path, handler) => {
            app.patch(path, wrapHandler(handler));
        },
        finalize: () => new Server(app),
    };
};
export class Server {
    constructor(app) {
        this.app = app;
    }
    listenAtPort(port) {
        if (!port)
            throw new Error('called without port number');
        this.server = createServer(this.app);
        this.server.listen(port);
    }
    stopListening() {
        return new Promise((resolve, reject) => {
            if (!this.server)
                return reject('no server started');
            this.server.close((error) => {
                if (error)
                    return reject(error);
                resolve();
            });
        });
    }
}
