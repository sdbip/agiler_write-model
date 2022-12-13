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
import cors from 'cors';
import { createServer } from 'http';
export var StatusCode;
(function (StatusCode) {
    StatusCode[StatusCode["OK"] = 200] = "OK";
    StatusCode[StatusCode["Created"] = 201] = "Created";
    StatusCode[StatusCode["NoContent"] = 204] = "NoContent";
    StatusCode[StatusCode["NotFound"] = 404] = "NotFound";
    StatusCode[StatusCode["InternalServerError"] = 500] = "InternalServerError";
})(StatusCode || (StatusCode = {}));
export const NOT_FOUND = { statusCode: StatusCode.NotFound };
export const NO_CONTENT = { statusCode: StatusCode.NoContent };
export const setupServer = () => {
    const app = express();
    app.use(cors());
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
                        statusCode: StatusCode.InternalServerError,
                        content: { error },
                    };
                }
            });
        }
        function toResponse(result) {
            var _a;
            if (typeof result === 'string')
                return {
                    statusCode: StatusCode.OK,
                    content: result,
                };
            const responseData = result;
            return {
                statusCode: (_a = responseData.statusCode) !== null && _a !== void 0 ? _a : StatusCode.OK,
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
            response.statusCode = (_a = responseData === null || responseData === void 0 ? void 0 : responseData.statusCode) !== null && _a !== void 0 ? _a : StatusCode.OK;
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
