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
const transcription_1 = __importDefault(require("./transcription"));
const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
const axiosHelper_1 = __importDefault(require("./axiosHelper"));
const sdk_read = require('api')('@gupshup/v1.0#52yl2v10lk9hvls9');
require("dotenv").config();
const db_1 = __importDefault(require("../db"));
const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;
const apiKey = process.env.GPAPIKEY;
const clientKey = process.env.APIKEY;
// bhabhi -2 : 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
// Create a list to store message IDs
const processedMessageIds = [];
const verify = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Inside function");
    const payload = req.body.payload;
    console.log(payload);
    // Check if the payload type is "sandbox-start"
    if (payload && payload.type === "sandbox-start") {
        // Return an empty response with HTTP_SUCCESS (2xx) status code
        res.status(200).send("");
        // Acknowledge the reception immediately, as per your requirements
        setTimeout(() => {
            // You can put your asynchronous processing logic here if needed
            // Acknowledge the reception
            console.log("Acknowledged receipt of sandbox-start event");
        }, 500);
    }
    else {
        try {
            const phoneNumber = payload.sender.phone;
            const user = yield db_1.default.users.findFirst({
                where: { phone_no: phoneNumber },
            });
            if (user != null && !(user === null || user === void 0 ? void 0 : user.optIn)) {
                ask_consent(res, payload);
            }
            else if (user != null) {
                markAsSenn(payload.id);
                const destination = phoneNumber + "";
                if (payload.type === "audio") {
                    // Fetching transcription result.
                    const audioURL = payload.payload.url;
                    (0, transcription_1.default)(audioURL)
                        .then((transcript) => __awaiter(void 0, void 0, void 0, function* () {
                        // Check if the message ID is in the processedMessageIds list
                        if (!processedMessageIds.includes(payload.id)) {
                            processedMessageIds.push(payload.id);
                            yield (0, axiosHelper_1.default)(user.id, destination, transcript, req, res)
                                .then(() => {
                                console.log("Message sent successfully");
                                res.status(200).send("");
                            })
                                .catch((error) => {
                                console.error("Error sending message:", error);
                                res.status(500).send("");
                            });
                        }
                    }))
                        .catch((error) => {
                        // Handle any errors
                        console.error("Error:", error);
                    });
                }
                else {
                    if (!processedMessageIds.includes(payload.id)) {
                        processedMessageIds.push(payload.id);
                        yield (0, axiosHelper_1.default)(user.id, destination, payload.payload.text, req, res)
                            .then(() => {
                            console.log("Message sent successfully");
                            res.status(200).send("");
                        })
                            .catch((error) => {
                            console.error("Error sending message:", error);
                            res.status(500).send("");
                        });
                    }
                }
            }
            else {
                let init_tokenData = {
                    access_token: "",
                    refresh_token: "",
                    scope: "",
                    token_type: "",
                    expiry_date: 0,
                };
                yield db_1.default.users.upsert({
                    where: { phone_no: phoneNumber },
                    update: {},
                    create: {
                        phone_no: phoneNumber,
                        credits: "10",
                        token: init_tokenData,
                        optIn: true,
                    },
                });
            }
        }
        catch (e) {
            console.log("User Inbound message.");
        }
    }
});
function ask_consent(res, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        // Accessing the phone number
        try {
            const phoneNumber = payload.sender.phone;
            sdk.markauserasoptedIn({ user: phoneNumber }, {
                appname: "ProductiveGPT",
                apikey: apiKey,
            });
            let init_tokenData = {
                access_token: "",
                refresh_token: "",
                scope: "",
                token_type: "",
                expiry_date: 0,
            };
            yield db_1.default.users.upsert({
                where: { phone_no: phoneNumber },
                update: {},
                create: {
                    phone_no: phoneNumber,
                    credits: "10",
                    token: init_tokenData,
                    optIn: true,
                },
            });
            res.status(200).send("");
        }
        catch (e) {
            console.log("Error");
        }
    });
}
function markAsSenn(id) {
    sdk_read.markMessageAsRead({
        appId: 'c230660f-427a-46cb-b2a1-e7487e607142',
        msgId: id,
        apikey: 'u7maer3xezr2dsrsstbq0voosxs5g8sm'
    });
}
exports.default = verify;
