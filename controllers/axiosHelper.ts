import axios, { AxiosResponse } from "axios";
import msgData from "../interfaces/msgData";
import responseData from "../interfaces/responseData";
require("dotenv").config();
import moment from "moment-timezone";
import prisma from "../db";
import event_controller from "../controllers/set_event";

import { OpenAI } from "langchain/llms/openai";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { HumanMessage, AIMessage } from "langchain/schema";
import { ConversationChain } from "langchain/chains";
import { Request, Response } from "express";
import { token } from "morgan";
import TokenData from "../interfaces/TokenData";

//Getting APIKEY from env
const clientKey: string = process.env.APIKEY as string;
const openaiApiKey = process.env.OPENAPI as string;

//initialize a list for storing messages.
const conversations: { [key: string]: any[] } = {};
let pastMessages: (HumanMessage | AIMessage)[] = [];
const deliveredMessages: { [key: string]: number } = {};

const sendAxiosRequest = async (
  id:string,
  from: string,
  input_text: string,
  req: Request,
  res: Response
): Promise<AxiosResponse> => {
  
  let userMessage = input_text;
  conversations[from] = [];
  // Initialize conversations when a new session starts
  if (!conversations[from] && deliveredMessages[from]) {
    // Fetch and format past conversation data from the database
    let previous_data = await prisma.conversation.findMany({
        where: { phone_no: from }
    });
    conversations[from] = [];
    pastMessages = pastMessages.concat(
        ...previous_data.map(conversation1 => [
          new HumanMessage(conversation1.user_reply),
          new AIMessage(conversation1.ai_reply),
        ])
      );
  }
  console.log("userMessage");
  let response: string = await sendMessage(from, userMessage, openaiApiKey);
  console.log("Response : " + response);
  const dataArray = JSON.parse(response);
  if (Array.isArray(dataArray)) {
    // It's an array, so loop through the items
    for (const item of dataArray) {
      if (item.type.toLowerCase() === "meeting") {
        console.log(item.type.toLowerCase());
        await validate_response(item, from, req, res);
      } else {
        await send_calendar_msg(from, item.answer);
      }
    }
  } else {
    // It's a single object
    if (dataArray.type.toLowerCase() === "meeting") {
      validate_response(dataArray, from, req, res);
    } else {
      send_calendar_msg(from, dataArray.answer);
    }
  }
  console.log(conversations)
  await prisma.conversation.create({
              data: {
                  date: new Date(), // You can set the date as needed.
                  phone_no: from,
                  user_reply: userMessage, // Set the user timestamp as needed.
                  ai_reply: response,  // Set the AI timestamp as needed.
                  user: { connect: { id: id } }, // Connect the conversation to the user.
              },
      });
  try {
    return dataArray;
  } catch (error) {
    throw error;
  }
};

async function validate_response(
  inputString: responseData,
  from: string,
  req: Request,
  res: Response
) {
  console.log("The input we got for validating -", inputString);
  // Define regular expressions for extracting title, time, length, and date
  let meetingData: responseData = inputString;

  const length = meetingData.meetinglength
    ? meetingData.meetinglength
    : "30 minutes"; // Default to 30 minutes if not specified

  //TODO: Check the user token to skip verification process;
  let user_tokenDB = await prisma.users.findFirst({
    where: { phone_no: from },
  });
  console.log(user_tokenDB?.token);
  if (user_tokenDB?.token != null && user_tokenDB?.token.access_token === "") {
    // Call the verify_consent middleware
    await event_controller.verify_consent(from, req, res, async () => {
      // Access the authUrl from the req object
      const authUrl: string = req.authUrl as string;
      // Call your function to send the authUrl as a WhatsApp message
      await send_calendar_msg(from, authUrl);
    });
  } else if (user_tokenDB?.token != null) {
    const endTime = calculateEndTime(
      inputString.time,
      parseInt(inputString.meetinglength, 10)
    );
    // Parse the user input
    const title = meetingData.title;
    const startTime = meetingData.time;
    const googleMeet = "Yes";
    // Parse the time
    const matchStart = startTime.match(/(\d{1,2}):(\d{2})\s?([APap][Mm])/);
    const matchEnd = endTime.match(/(\d{1,2}):(\d{2})\s?([APap][Mm])/);

    if (matchStart && matchEnd) {
      const [fullHour, startHour, startMinute, startPeriod] = matchStart;
      const [fullhour, endHour, endMinute, endPeriod] = matchEnd;
      // startHour, startMinute, and startPeriod now contain the extracted values
      console.log("startHour:", startHour); // 6
      console.log("startMinute:", startMinute); // 15
      console.log("startPeriod:", startPeriod); // PM
      const parsedMeeting = {
        title: title,
        startTime: `${startHour}:${startMinute} ${startPeriod}`,
        endTime: `${endHour}:${endMinute} ${endPeriod}`,
        googleMeet: googleMeet,
        dbtoken: user_tokenDB?.token,
      };
      await event_controller.create_event(parsedMeeting, req, res, async () => {
        // Call your function to send the authUrl as a WhatsApp message
        await send_calendar_msg(from, req.authUrl);
      });
    } else {
      console.log("Invalid time format");
    }
  }
}

async function send_calendar_msg(to: string, text?: string) {
  // Send a text message
  const sourceName = "ProductiveGPT";

  const axiosConfig = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: clientKey,
    },
  };

  const postData = {
    channel: "whatsapp",
    source: "919713358874",
    destination: to,
    message: text,
    "src.name": sourceName,
  };

  try {
    const response = await axios.post(
      "https://api.gupshup.io/wa/api/v1/msg",
      postData,
      axiosConfig
    );
    deliveredMessages[to] = Date.now();
    return response;
  } catch (error) {
    throw error;
  }
}

function calculateEndTime(startTime: string, durationMinutes: number) {
  // Parse the start time
  const [time, period] = startTime.split(" ");
  const [hours, minutes] = time.split(":").map(Number);

  // Convert start time to total minutes
  let totalMinutes = hours * 60 + minutes;

  // Add the duration
  totalMinutes += durationMinutes;

  // Calculate the end time
  let endHours = Math.floor(totalMinutes / 60);
  let endMinutes = totalMinutes % 60;

  // Adjust for the 12-hour clock
  if (period === "PM" && endHours < 12) {
    endHours += 12;
  }

  // Format the result in 12-hour time format
  const endPeriod = endHours >= 12 ? "PM" : "AM";
  endHours = endHours % 12 || 12; // Ensure 12:00 PM or AM is displayed as is

  return `${endHours}:${endMinutes.toString().padStart(2, "0")} ${endPeriod}`;
}

async function sendMessage(to: string, text: string, openaiApiKey: string) {
  try {
    // Get conversation history for the current user
    const conversation = conversations[to] || [];
    console.log(conversation);
    // Check if the last message in the conversation history is an assistant response
    // const lastMessage = conversation[conversation.length - 1];
    // if (lastMessage && lastMessage.role === 'assistant') {
    //     console.log('Skipping duplicate response:', text);
    //     return;
    // }
    // Construct the messages array with user messages and assistant responses (excluding previous assistant responses)
    const userMessages = conversation.filter(
      (message) => message.role === "user"
    );
    const assistantResponses = conversation.filter(
      (message) => message.role === "assistant"
    );
    const filteredAssistantResponses = assistantResponses.slice(-1); // Get the last assistant response

    const currentDate = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");
    // Construct the messages array with the conversation history and user message
    const messages = [
      {
        role: "system",
        content: `Process the following statement "${text}" and return the response in the following JSON format:

            - If the statement is about scheduling a meeting:
              {
                "answer": "Your response",
                "title": "Title of the meeting",
                "time": "Start time in 12-hour format, e.g., 5:00 PM",
                "guest": "List of attendees",
                "meetinglength": "Duration of the meeting in minutes",
                "date": "Meeting date in the format YYYY-MM-DD",
                "type": "Meeting"
              }
            
            - If the statement is general, please provide the assistance you provide for a question(not related to scheduling a meeting):
              {
                "answer": "Your response",
                "type": "General"
              }
            
            - If the statement contains multiple sentences, return a list of JSON objects for each sentence.
            
            Please note:
            - For the "meetinglength" field, if not provided, assume a default duration of 30 minutes. Add this duration to the start time and represent it in the same 12-hour format.
            - For the "date" field, if not provided, assume today's date.
            - If the statement contains multiple sentences, provide a list of JSON responses, one for each sentence.
            
            The response should follow this structure to provide clear and organized information based on the nature of the statement.`,
      },
      ...userMessages,
      ...assistantResponses,
      ...filteredAssistantResponses,
      { role: "user", content: text },
    ];

    const openaiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
      }
    );

    const generatedResponse =
      openaiResponse.data.choices[0].message.content.trim();
    // Add assistant response to the conversation history
    conversations[to].push({ role: "assistant", content: generatedResponse });
    return generatedResponse;
  } catch (error) {
    console.error("Error:", error);
  }
}

async function langchain_model(to: string, text: string, openaiApiKey: string) {
  try {
    const model = new OpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0,
      maxTokens: 2500,
      openAIApiKey: openaiApiKey,
    });
    console.log(pastMessages);

    const currentDate = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");
    console.log(currentDate);

    const memory = new BufferMemory({
      chatHistory: new ChatMessageHistory(pastMessages),
    });
    const chain = new ConversationChain({ llm: model, memory: memory });
    const res1 = await chain.call({
      input: `Process the following statement "${text}" and then return me the response ONLY in the following format JSON({'answer': your response, 'type': General(if the statement is general)/ Meeting(if statement is related to scheduling meeting otr anything related to meetings)}). If there are more than one sentences in the statement, return me as list of JSONs.`,
      // input: "If your question is related to scheduling events in a calendar, please provide the details such as the title, time, length (default 30 min), and date (consider today is "+ currentDate +"). For example, you can say 'Schedule a meeting with John tomorrow at 3 PM for 1 hour.' If your question is not about scheduling events, you can ask any other question or request assistance, and I'll provide the answer.Return me the data in the following format JSON({'answer': The answer, 'type': General assistance / Meeting}). My Question"
    });
    console.log({ res1 });

    // Extract the generated response from the result
    const generatedResponse = res1.response.trim();
    console.log(generatedResponse);

    console.log("OpenAI Response:", generatedResponse);

    // Add assistant response to the conversation history
    conversations[to].push({ role: "assistant", content: generatedResponse });
    return generatedResponse;
  } catch (error) {
    console.error("Error:", error);
  }
}

export default sendAxiosRequest;
