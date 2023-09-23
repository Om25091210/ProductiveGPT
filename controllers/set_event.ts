import { Response, Request, NextFunction } from "express";
import { google, calendar_v3 } from 'googleapis';
import fs from 'fs';
import axios from "axios";
import types from "./express";
import moment from 'moment-timezone';
import { Credentials } from 'google-auth-library';
import parsedMeeting from '../interfaces/parseMeeting';
require("dotenv").config();

// Your credentials from Google Cloud Console
const credentials = {
    // Your client ID and client secret
    client_id: process.env.CLIENT_ID as string,
    client_secret: process.env.CLIENT_SECRET as string,
    // Redirect URIs should match the one you set in the Google Cloud Console
    redirect_uris: ['https://66b1-106-76-243-117.ngrok-free.app/auth-callback'],
  };


const oAuth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uris[0]
);
  
// Generate the authorization URL and print it
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
});

const verify_consent=async(req:Request,res:Response,next:NextFunction)=>{
    console.log('Authorize this app by visiting this URL:', authUrl);
    req.authUrl = "*Permission required.*\n Please click the link to enable setting events using Google Calendar.\n"+authUrl; // Set the authUrl on the req object
    next();
};

const auth_call=async(req:Request,res:Response,next:NextFunction)=>{
    const code: string = req.query.code as string;
    console.log(code);
    if (code) {
      await oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error retrieving access token', err);
          res.status(500).send('Error retrieving access token');
          return;
        }
        const validToken = token as Credentials; // Explicitly type the token as Credentials
        oAuth2Client.setCredentials(validToken);
        // Store the token for later use
        // Here you should store the token securely (e.g., in a database)
        // for subsequent API requests.
        // Store the token locally
        fs.writeFileSync('../token.json', JSON.stringify(token));
        console.log('Access token retrieved and stored:', token);
        res.send('Authorization successful!');
        next();
      });
    } else {
      res.status(400).send('Missing authorization code.');
      next();
    }
};


const create_event= async(from:string,token:string,parsedMeeting:parsedMeeting,req:Request,res:Response,next:NextFunction)=>{
    // Use the access token to make API requests
  // Load the stored token from the local file
  const storedToken = require('../token.json');
  oAuth2Client.setCredentials(storedToken);

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  // Get the current time in Kolkata (IST)
  const now = moment.tz('Asia/Kolkata');
  // Parse the time string using moment
  let parsedTime = moment(parsedMeeting.startTime, "h:mm a");
  // Add 1 hour to the current time for the event's start and end times
  const startTime = now.clone().set({
    hour: parsedTime.hour(),
    minute: parsedTime.minute(),
    second: 0,
    millisecond: 0
  });
  //Parse the endtime with moment
  parsedTime = moment(parsedMeeting.endTime, "h:mm a");
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
      dateTime: startTime.format(), // Format the time in ISO 8601
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endTime.format(), // Format the time in ISO 8601
      timeZone: 'Asia/Kolkata',
    },
     // Conference details for Google Meet
     conferenceData: {
      createRequest: {
        requestId: 'random-string', // Unique string identifier for the request
      },
    },
  };

  await calendar.events.insert(
    {
      calendarId: 'primary', // Use 'primary' to add the event to the user's primary calendar
      requestBody: event,
      conferenceDataVersion: 1, // Conference data version
    },
    (err:any, result:any) => {
      if (err) {
        console.error('Error creating event:', err);
        req.authUrl="Error creating event:";
        next();
      }
      console.log('Event created:', result.data.htmlLink);
      req.authUrl="Event created successfully!!";
      next()
    }
  );
};

function send_calendar_msg(to: string, text: string, token: string) {
  // Send a text message
  axios({
    method: "POST",
    url:
      "https://graph.facebook.com/v17.0/104119296099196/messages?access_token=" +
      token,
    data: {
      messaging_product: "whatsapp",
      to: to,
      text: {
        body: text,
      },
    },
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export default { create_event,auth_call,verify_consent };