import { Response, Request, NextFunction } from "express";
import { google, calendar_v3 } from 'googleapis';
import fs from 'fs';
import axios from "axios";
import prisma from "../db";
import types from "./express";
import moment from 'moment-timezone';
import { Credentials } from 'google-auth-library';
import parsedMeeting from '../interfaces/parseMeeting';
import TokenData from "../interfaces/TokenData";
const turl = require('turl');
require("dotenv").config();

// Your credentials from Google Cloud Console
const credentials = {
    // Your client ID and client secret
    client_id: "587504325771-2um6j3u4fieao3bpso064gj32po77or1.apps.googleusercontent.com",
    client_secret: "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",
    // Redirect URIs should match the one you set in the Google Cloud Console
    redirect_uris: ['https://b1c5-2405-201-3029-201c-81e0-8574-97a7-254f.ngrok-free.app/auth-callback'],
  };

// Now you can use this redirectUri in your OAuth URL
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

const verify_consent=async(ph_no:string,req:Request,res:Response,next:NextFunction)=>{
  // Now you can use this redirectUri in your OAuth URL
  const oAuth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uris[0]
  );
  
  // Generate the authorization URL and print it
  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: JSON.stringify({ a: ph_no})
  });
  
  console.log('Authorize this app by visiting this URL:', authUrl);
  turl.shorten(authUrl).then((result:string) => {
    req.authUrl = "*Permission required.*\n Please click the link to enable setting events using Google Calendar.\n"+result; // Set the authUrl on the req object
    console.log(result);
    next();
  });
};

const auth_call = async (req: Request, res: Response, next: NextFunction) => {
  const code: string = req.query.code as string;
  // Extract the 'state' parameter from the query parameters
  const stateParam: string = req.query.state as string;
  const stateObject = JSON.parse(decodeURIComponent(stateParam));
  const phoneNumber = stateObject.a;

  if (!code) {
    res.status(400).send('Missing authorization code.');
    return;
  }

  try {
    const token = await oAuth2Client.getToken(code);
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
    await prisma.users.upsert({
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
  } catch (err) {
    console.error('Error retrieving access token', err);
    res.status(500).send('Error retrieving access token');
  }
};

const create_event= async(parsedMeeting:parsedMeeting,req:Request,res:Response,next:NextFunction)=>{
    // Use the access token to make API requests
  // Load the stored token from the local file
  if (parsedMeeting.dbtoken) {
    
    const storedToken: Credentials = {
      access_token: parsedMeeting.dbtoken.access_token,
      refresh_token: parsedMeeting.dbtoken.refresh_token,
      scope: parsedMeeting.dbtoken.scope,
      token_type: parsedMeeting.dbtoken.token_type,
      expiry_date: Number(parsedMeeting.dbtoken.expiry_date), // Convert bigint to number
    };
    //const storedTokent = require('../token.json');
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
        }else{
          const meetLink = result.data.hangoutLink;
          console.log('Event created:', result.data.htmlLink);
          req.authUrl="*Event created successfully!!*\n*Link* - "+meetLink;
          next()
        }
      }
    );
  }
};

export default { create_event,auth_call,verify_consent };