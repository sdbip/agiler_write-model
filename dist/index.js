var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b;
import { setupServer } from './server.js';
const setup = setupServer();
setup.get('/', () => __awaiter(void 0, void 0, void 0, function* () {
    return { message: 'alive', test: process.env.TEST };
}));
const server = setup.finalize();
const port = (_b = parseInt((_a = process.env.PORT) !== null && _a !== void 0 ? _a : '80')) !== null && _b !== void 0 ? _b : 80;
server.listenAtPort(port);
process.stdout.write(`\x1B[35mListening on port \x1B[30m${port !== null && port !== void 0 ? port : '80'}\x1B[0m\n\n`);
