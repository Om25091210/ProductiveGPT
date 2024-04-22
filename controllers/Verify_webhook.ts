
import express, { Response, Request, NextFunction } from "express";
import msgData from "../interfaces/msgData";
import transcribeAudioFromURL from "./transcription";
const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
import axios from "axios";
import sendAxiosRequest from "./axiosHelper";
const sdk_read = require('api')('@gupshup/v1.0#52yl2v10lk9hvls9');


require("dotenv").config();
import prisma from "../db";
import TokenData from "../interfaces/TokenData";

const token = process.env.TOKEN;
const mytoken: string = process.env.MYTOKEN as string;
const apiKey: string = process.env.GPAPIKEY as string;
const clientKey: string = process.env.APIKEY as string;
// bhabhi -2 : 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
// Create a list to store message IDs
const processedMessageIds: string[] = [];

const verify = async (req: Request, res: Response, next: NextFunction) => {
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
  } else {
    try {
      const phoneNumber = payload.sender.phone;

      const user = await prisma.users.findFirst({
        where: { phone_no: phoneNumber },
      });
      if (user != null && !user?.optIn) {
        ask_consent(res, payload);
      } else if (user != null) {
        markAsSenn(payload.id);
        const destination = phoneNumber + "";

        if (payload.type === "audio") {
          // Fetching transcription result.
          const audioURL = payload.payload.url;
          transcribeAudioFromURL(audioURL)
            .then(async (transcript) => {
              // Check if the message ID is in the processedMessageIds list
              if (!processedMessageIds.includes(payload.id)) {
                processedMessageIds.push(payload.id);
                await sendAxiosRequest(user.id,destination,transcript,req,res)
                  .then(() => {
                    console.log("Message sent successfully");
                    res.status(200).send("");
                  })
                  .catch((error) => {
                    console.error("Error sending message:", error);
                    res.status(500).send("");
                  });
              }
            })
            .catch((error) => {
              // Handle any errors
              console.error("Error:", error);
            });
        } else {
          if (!processedMessageIds.includes(payload.id)) {
            processedMessageIds.push(payload.id);
            await sendAxiosRequest(user.id,destination,payload.payload.text,req,res)
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
      } else {
        let init_tokenData = {
          access_token: "",
          refresh_token: "",
          scope: "",
          token_type: "",
          expiry_date: 0,
        };

        await prisma.users.upsert({
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
    } catch (e) {
      console.log("User Inbound message.");
    }
  }
};

async function ask_consent(res: Response, payload: msgData) {
  // Accessing the phone number
  try {
    const phoneNumber = payload.sender.phone;

    sdk.markauserasoptedIn(
      { user: phoneNumber },
      {
        appname: "ProductiveGPT",
        apikey: apiKey,
      }
    );

    let init_tokenData = {
      access_token: "",
      refresh_token: "",
      scope: "",
      token_type: "",
      expiry_date: 0,
    };

    await prisma.users.upsert({
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
  } catch (e) {
    console.log("Error");
  }
}

function markAsSenn(id: any) {
  sdk_read.markMessageAsRead({
    appId: 'c230660f-427a-46cb-b2a1-e7487e607142',
    msgId: id,
    apikey: 'u7maer3xezr2dsrsstbq0voosxs5g8sm'
  })
}

export default verify;
