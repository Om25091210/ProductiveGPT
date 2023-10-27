"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Verify_webhook_1 = __importDefault(require("../controllers/Verify_webhook"));
const get_msgs_1 = __importDefault(require("../controllers/get_msgs"));
const set_event_1 = __importDefault(require("../controllers/set_event"));
const router = (0, express_1.default)();
router.post("/verify", Verify_webhook_1.default);
router.post("/webhook", get_msgs_1.default.parse_message);
router.get("/auth-callback", set_event_1.default.auth_call);
//router.get("/create-event",event_controller.create_event);
router.get("/verify-consent", set_event_1.default.verify_consent);
exports.default = router;
