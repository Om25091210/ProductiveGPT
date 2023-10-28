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
const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
const axiosHelper_1 = __importDefault(require("./axiosHelper"));
require("dotenv").config();
const db_1 = __importDefault(require("../db"));
const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;
const apiKey = process.env.GPAPIKEY;
const clientKey = process.env.APIKEY;
const verify = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Inside function");
    // ** In order to send and recieve updates from this webhook, Whatsapp sends a parameter mode
    //**   which is needed to subscribe for further messages. Also it sends the Challenge which needs to be returned with the 200 status code
    //**   Once the verify token is Verified.
    // let mode:string =req.query["hub.mode"] as string;
    // let challenge:string =req.query["hub.challenge"] as string;
    // let verify:string=req.query["hub.verify_token"] as string;
    // console.log(mode === "subscribe");
    // console.log(challenge);
    // if (mode) {
    //     if (mode === "subscribe" && verify === mytoken) {
    //       console.log("success");
    //       res.status(200).send(challenge);
    //       return;
    //     } else {
    //       console.log("error");
    //       res.status(403).send(challenge);
    //       return;
    //     }
    //   }
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
        console.log("Inside else function");
        try {
            const phoneNumber = payload.sender.phone;
            const user = yield db_1.default.users.findFirst({
                where: { phone_no: phoneNumber },
            });
            console.log("user");
            console.log(user);
            if (user != null && !(user === null || user === void 0 ? void 0 : user.optIn)) {
                ask_consent(res, payload);
            }
            else if (user != null) {
                const destination = phoneNumber + "";
                (0, axiosHelper_1.default)(destination, payload, req, res)
                    .then(() => {
                    console.log("Message sent successfully");
                    res.status(200).send("");
                })
                    .catch((error) => {
                    console.error("Error sending message:", error);
                    res.status(500).send("");
                });
            }
            else {
                let init_tokenData = {
                    "access_token": "",
                    "refresh_token": "",
                    "scope": "",
                    "token_type": "",
                    "expiry_date": 0
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
            console.log(payload.sender.phone);
            const phoneNumber = payload.sender.phone;
            sdk.markauserasoptedIn({ user: phoneNumber }, {
                appname: "ProductiveGPT",
                apikey: apiKey,
            });
            let init_tokenData = {
                "access_token": "",
                "refresh_token": "",
                "scope": "",
                "token_type": "",
                "expiry_date": 0
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
exports.default = verify;
