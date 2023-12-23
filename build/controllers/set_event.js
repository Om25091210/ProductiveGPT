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
const googleapis_1 = require("googleapis");
const db_1 = __importDefault(require("../db"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const turl = require('turl');
require("dotenv").config();
// Your credentials from Google Cloud Console
const credentials = {
    // Your client ID and client secret
    client_id: "587504325771-5ci8erb2ihfkq37fjd23qidsfl57mnjg.apps.googleusercontent.com",
    client_secret: "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",
    // Redirect URIs should match the one you set in the Google Cloud Console
    redirect_uris: ['https://productive-gpt.vercel.app/auth-callback'],
};
// Now you can use this redirectUri in your OAuth URL
const oAuth2Client = new googleapis_1.google.auth.OAuth2(credentials.client_id, credentials.client_secret, credentials.redirect_uris[0]);
// Generate the authorization URL and print it
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
});
const verify_consent = (ph_no, req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Now you can use this redirectUri in your OAuth URL
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(credentials.client_id, credentials.client_secret, credentials.redirect_uris[0]);
    // Generate the authorization URL and print it
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.events'],
        state: JSON.stringify({ a: ph_no })
    });
    console.log('Authorize this app by visiting this URL:', authUrl);
    turl.shorten(authUrl).then((result) => {
        req.authUrl = "*Permission required.*\n Please click the link to enable setting events using Google Calendar.\n" + result; // Set the authUrl on the req object
        console.log(result);
        next();
    });
});
const auth_call = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const code = req.query.code;
    // Extract the 'state' parameter from the query parameters
    const stateParam = req.query.state;
    const stateObject = JSON.parse(decodeURIComponent(stateParam));
    const phoneNumber = stateObject.a;
    if (!code) {
        res.status(400).send('Missing authorization code.');
        return;
    }
    try {
        const token = yield oAuth2Client.getToken(code);
        const validToken = token.tokens;
        // Store the token in a file with a unique name
        // const filename = `token_${phoneNumber}.json`;
        // fs.writeFileSync(filename, JSON.stringify(validToken));
        // Prepare the token data for the database
        const init_tokenData = {
            access_token: validToken.access_token || '',
            refresh_token: validToken.refresh_token || '',
            scope: validToken.scope || '',
            token_type: validToken.token_type || '',
            expiry_date: validToken.expiry_date || 0,
        };
        // Assuming Prisma schema and model are set up properly
        yield db_1.default.users.upsert({
            where: { phone_no: phoneNumber },
            update: {
                token: init_tokenData,
            },
            create: {
                phone_no: phoneNumber,
                credits: "10",
                token: init_tokenData,
                optIn: true,
                // Set other fields as needed
            },
        });
        console.log('Access token retrieved and stored:', validToken);
        res.send('Authorization successful!');
        next();
    }
    catch (err) {
        console.error('Error retrieving access token', err);
        res.status(500).send('Error retrieving access token');
    }
});
const create_event = (parsedMeeting, req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Use the access token to make API requests
    // Load the stored token from the local file
    if (parsedMeeting.dbtoken) {
        const storedToken = {
            access_token: parsedMeeting.dbtoken.access_token,
            refresh_token: parsedMeeting.dbtoken.refresh_token,
            scope: parsedMeeting.dbtoken.scope,
            token_type: parsedMeeting.dbtoken.token_type,
            expiry_date: Number(parsedMeeting.dbtoken.expiry_date), // Convert bigint to number
        };
        //const storedTokent = require('../token.json');
        oAuth2Client.setCredentials(storedToken);
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oAuth2Client });
        // Get the current time in Kolkata (IST)
        const now = moment_timezone_1.default.tz('Asia/Kolkata');
        // Parse the time string using moment
        let parsedTime = (0, moment_timezone_1.default)(parsedMeeting.startTime, "h:mm a");
        // Add 1 hour to the current time for the event's start and end times
        const startTime = now.clone().set({
            hour: parsedTime.hour(),
            minute: parsedTime.minute(),
            second: 0,
            millisecond: 0
        });
        //Parse the endtime with moment
        parsedTime = (0, moment_timezone_1.default)(parsedMeeting.endTime, "h:mm a");
        const endTime = now.clone().set({
            hour: parsedTime.hour(),
            minute: parsedTime.minute(),
            second: 0,
            millisecond: 0
        });
        const event = {
            summary: parsedMeeting.title,
            description: '',
            start: {
                dateTime: startTime.format(),
                timeZone: 'Asia/Kolkata',
            },
            end: {
                dateTime: endTime.format(),
                timeZone: 'Asia/Kolkata',
            },
            // Conference details for Google Meet
            conferenceData: {
                createRequest: {
                    requestId: 'random-string', // Unique string identifier for the request
                },
            },
        };
        yield calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1, // Conference data version
        }, (err, result) => {
            if (err) {
                console.error('Error creating event:', err);
                req.authUrl = "Error creating event:";
                next();
            }
            else {
                const meetLink = result.data.hangoutLink;
                console.log('Event created:', result.data.htmlLink);
                req.authUrl = "*Event created successfully!!*\n*Link* - " + meetLink;
                next();
            }
        });
    }
});
exports.default = { create_event, auth_call, verify_consent };
