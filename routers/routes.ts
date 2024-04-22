import express, { Express, Request, Response, NextFunction } from 'express';
import verify_controller from '../controllers/Verify_webhook';
import msg_controller from '../controllers/get_msgs';
import event_controller from '../controllers/set_event';
import sendTask from '../controllers/sendTask';

const router: Express = express();

router.post("/verify",verify_controller);
router.post("/webhook",msg_controller.parse_message);
router.get("/auth-callback",event_controller.auth_call);
router.post("/sendTask",sendTask);
//router.get("/create-event",event_controller.create_event);
router.get("/verify-consent",event_controller.verify_consent);

export default router;