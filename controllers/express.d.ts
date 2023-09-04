import { Request } from 'express';

declare module 'express' {
    interface Request {
        authUrl?: string; // Add the authUrl property to Request interface
    }
}
