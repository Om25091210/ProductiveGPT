"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routers/routes"));
const app = (0, express_1.default)();
//**Logging*/
app.use((0, morgan_1.default)('dev'));
//** Parse the request */
app.use(express_1.default.urlencoded({ extended: false }));
//** Takes care of JSON data */
app.use(express_1.default.json());
//** Routes */
app.use('/', routes_1.default);
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 6060;
const httpServer = http_1.default.createServer(app);
httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
