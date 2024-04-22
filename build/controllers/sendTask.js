"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
require("dotenv").config();
const clientKey = process.env.APIKEY;
const sendTask = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, from, input_text } = req.body; // Assuming 'id' is not used here
    try {
        const response = yield send_calendar_msg(from, input_text);
        res.json({ success: true, data: response.data }); // Send back success response
    }
    catch (error) {
        next(error); // Pass error to Express error handler
    }
});
function send_calendar_msg(to, text) {
    return __awaiter(this, void 0, void 0, function* () {
        const sourceName = "ProductiveGPT";
        const axiosConfig = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "apikey": clientKey, // Make sure this is correctly set in your .env file
            },
        };
        const postData = {
            channel: "whatsapp",
            source: "919713358874",
            destination: to,
            message: text,
            "src.name": sourceName,
        };
        try {
            const response = yield axios_1.default.post("https://api.gupshup.io/sm/api/v1/msg", postData, axiosConfig);
            return response;
        }
        catch (error) {
            throw error;
        }
    });
}
exports.default = sendTask;
