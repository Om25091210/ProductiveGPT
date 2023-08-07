import express, { Express, Request, Response, NextFunction } from 'express';
import verify_controller from '../controllers/Verify_webhook';
import msg_controller from '../controllers/get_msgs';

const router: Express = express();

router.get("/webhook",verify_controller);
router.post("/webhook",msg_controller.parse_message);

export default router;