import express, { Response, Request, NextFunction } from "express";
import msgData from "../interfaces/msgData";
const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
import axios from "axios";
import sendAxiosRequest from "./axiosHelper";

require("dotenv").config();
import prisma from "../db";
import TokenData from "../interfaces/TokenData";

const token = process.env.TOKEN;
const mytoken: string = process.env.MYTOKEN as string;
const apiKey: string = process.env.GPAPIKEY as string;
const clientKey: string = process.env.APIKEY as string;

const verify = async (req: Request, res: Response, next: NextFunction) => {
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
  } else {
    console.log("Inside else function");
    try {
      const phoneNumber = payload.sender.phone;
      const user = await prisma.users.findFirst({
        where: { phone_no: phoneNumber },
      });
      console.log("user");
      console.log(user);
      if (user!=null && !user?.optIn) {
        ask_consent(res, payload);
      } else if(user!=null){

        const destination=phoneNumber+"";

        await sendAxiosRequest(destination, payload, req, res)
          .then(() => {
            console.log("Message sent successfully");
            res.status(200).send("");
          })
          .catch((error) => {
            console.error("Error sending message:", error);
            res.status(500).send("");
          });
          
      }
      else{
        let init_tokenData={
          "access_token": "",
          "refresh_token": "",
          "scope": "",
          "token_type": "",
          "expiry_date": 0
        }
        
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
    console.log(payload.sender.phone);
    const phoneNumber = payload.sender.phone;

    sdk.markauserasoptedIn(
      { user: phoneNumber },
      {
        appname: "ProductiveGPT",
        apikey: apiKey,
      }
    );
    
    let init_tokenData={
      "access_token": "",
      "refresh_token": "",
      "scope": "",
      "token_type": "",
      "expiry_date": 0
    }
    
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
export default verify;
