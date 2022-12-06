var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from 'express';
import { createServer } from 'http';
export const NOT_FOUND = { statusCode: 404 };
export const setupServer = () => {
    const app = express();
    function wrapHandler(handler) {
        return (request, response) => __awaiter(this, void 0, void 0, function* () {
            const result = yield callHandler(request);
            outputResult(response, toResponse(result));
        });
        function callHandler(request) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield handler(request);
                }
                catch (thrown) {
                    const { message } = thrown;
                    const error = { message };
                    return {
                        statusCode: 500,
                        content: { error },
                    };
                }
            });
        }
        function toResponse(result) {
            var _a;
            if (typeof result === 'string')
                return {
                    statusCode: 200,
                    content: result,
                };
            const responseData = result;
            return {
                statusCode: (_a = responseData.statusCode) !== null && _a !== void 0 ? _a : 200,
                content: typeof responseData.content === 'string'
                    ? responseData.content
                    : JSON.stringify('content' in responseData
                        ? responseData.content
                        : responseData),
            };
        }
        function outputResult(response, result) {
            var _a;
            const responseData = result;
            response.statusCode = (_a = responseData === null || responseData === void 0 ? void 0 : responseData.statusCode) !== null && _a !== void 0 ? _a : 200;
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
