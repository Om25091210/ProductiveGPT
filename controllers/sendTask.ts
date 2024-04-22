import axios from "axios";
require("dotenv").config();
import { Response, Request, NextFunction } from "express";

const clientKey: string = process.env.APIKEY as string;

const sendTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id, from, input_text } = req.body; // Assuming 'id' is not used here
    try {
      const response = await send_calendar_msg(from, input_text);
      res.json({ success: true, data: response.data }); // Send back success response
    } catch (error) {
      next(error); // Pass error to Express error handler
    }
};

async function send_calendar_msg(to: string, text?: string) {
    const sourceName = "ProductiveGPT";
  
    const axiosConfig = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": clientKey, // Make sure this is correctly set in your .env file
      },
    };
  
    const postData = {
      channel: "whatsapp",
      source: "919713358874",
      destination: to,
      message: text,
      "src.name": sourceName,
    }
  
    try {
      const response = await axios.post(
        "https://api.gupshup.io/sm/api/v1/msg",
        postData,
        axiosConfig
      );
      return response;
    } catch (error) {
      throw error;
    }
}

export default sendTask;
