import express,{Response, Request, NextFunction} from "express";
require("dotenv").config();

const token = process.env.TOKEN;
const mytoken:string = process.env.MYTOKEN as string;

const verify= async(req:Request,res:Response,next:NextFunction)=>{
    console.log("Inside function");
    // ** In order to send and recieve updates from this webhook, Whatsapp sends a parameter mode
   //**   which is needed to subscribe for further messages. Also it sends the Challenge which needs to be returned with the 200 status code
   //**   Once the verify token is Verified.
    let mode:string =req.query["hub.mode"] as string;
    let challenge:string =req.query["hub.challenge"] as string;
    let verify:string=req.query["hub.verify_token"] as string;
    console.log(mode === "subscribe");
    console.log(challenge);
    if (mode) {
        if (mode === "subscribe" && verify === mytoken) {
          console.log("success");
          res.status(200).send(challenge);
          return;
        } else {
          console.log("error");
          res.status(403).send(challenge);
          return;
        }
      }
};

export default verify;