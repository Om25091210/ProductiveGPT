import { Response, Request, NextFunction } from "express";
import axios from "axios";
import moment from 'moment-timezone';

import { OpenAI } from "langchain/llms/openai";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { HumanMessage, AIMessage } from "langchain/schema";
import { ConversationChain } from "langchain/chains";

import prisma from "../db";
import event_controller from '../controllers/set_event';
import { Conversation } from "@prisma/client";
import { content } from "googleapis/build/src/apis/content";
require("dotenv").config();

const token = process.env.TOKEN as string;
const openaiApiKey = process.env.OPENAPI as string;

// Maintain conversation context globally
const conversations: { [key: string]: any[] } = {};
let pastMessages: (HumanMessage | AIMessage)[] = [];

const parse_message = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let body_param: any = req.body;
        console.log(JSON.stringify(body_param, null, 2));

        if (body_param.object) {
            if (
                body_param.entry &&
                body_param.entry[0].changes &&
                body_param.entry[0].changes[0].value.messages &&
                body_param.entry[0].changes[0].value.messages[0]
            ) {
                let from = body_param.entry[0].changes[0].value.messages[0].from;
                let userMessage = body_param.entry[0].changes[0].value.messages[0].text.body;

                // Initialize conversations when a new session starts
                if (!conversations[from]) {
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
                    // Add the system message to the conversation
                    conversations[from].push({ role: 'system', content: 'You are an intelligent assistant.' });
                }

                // Add user message to the conversation history
                conversations[from].push({ role: "human", content: userMessage });
                //Create the user (if it doesn't exist) or retrieve an existing user using Prisma.

                if (userMessage.toLowerCase().includes("set reminder")) {
                    //TODO: Check the user token to skip verification process;
                    // Call the verify_consent middleware
                    await event_controller.verify_consent(from,req, res, async () => {
                        // Access the authUrl from the req object
                        const authUrl:string = req.authUrl as string;
                        // Call your function to send the authUrl as a WhatsApp message
                        send_calendar_msg(from, authUrl, token);
                    });
                    const format:string = `
                            Please provide the following information for the meeting in this format:\nset\n1. Title of the meeting:\n2. Meeting time (in 12-hour format, e.g., 7:30pm-8:00pm):\n3. Include Google Meet link? (yes/no).
                            `;
                    send_calendar_msg(from, format, token);
                }
                else if(userMessage.toLowerCase().includes("set")){
                    //TODO: Take the user input on setting event;
                    console.log(userMessage);
                    // Parse the user input
                    const title = userMessage.match(/1\. (.+)/)[1];
                    const timeString = userMessage.match(/2\. (.+)/)[1];
                    const googleMeet = userMessage.match(/3\. (.+)/)[1].toLowerCase();

                    // Parse the time
                    const [startTime, endTime] = timeString.split('-').map((time: string) => time.trim());
                    const [startHour, startMinute, startPeriod] = startTime.match(/(\d{1,2}):(\d{2})([ap]m)/i).slice(1);
                    const [endHour, endMinute, endPeriod] = endTime.match(/(\d{1,2}):(\d{2})\s?([ap]m)/i).slice(1);

                    if (isValidTimeFormat(startTime) && isValidTimeFormat(endTime)) {
                        const parsedMeeting = {
                            title: title,
                            startTime: `${startHour}:${startMinute} ${startPeriod}`,
                            endTime: `${endHour}:${endMinute} ${endPeriod}`,
                            googleMeet: googleMeet
                          };
                        await event_controller.create_event(parsedMeeting,req, res, async () => {
                            // Call your function to send the authUrl as a WhatsApp message
                            await send_calendar_msg(from, "Event created successfully!!", token);
                        });
                    } else {
                    console.log("Invalid time format");
                    }
                } 
                else {
                    // Call your modified sendMessage function
                    //let response:string=await sendMessage(from, userMessage, token, openaiApiKey);
                    let response:string=await langchain_model(from, userMessage, token, openaiApiKey)
                    // const convo = await prisma.conversation.create({
                    //     data: {
                    //       date: new Date(), // You can set the date as needed.
                    //       phone_no: from,
                    //       user_reply: userMessage, // Set the user timestamp as needed.
                    //       ai_reply: response,  // Set the AI timestamp as needed.
                    //       user: { connect: { id: user.id } }, // Connect the conversation to the user.
                    //     },
                    //   });
                    res.sendStatus(200);
                }
                return;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        res.sendStatus(500);
    }
};
function isValidTimeFormat(time:string) {
    // Use a regular expression to validate the time format
    const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9](am|pm)$/i;
    return timeRegex.test(time);
  }
  
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

async function sendMessage(to: string, text: string, token: string, openaiApiKey: string) {
    try {
        // Get conversation history for the current user
        const conversation = conversations[to] || [];
        console.log(conversation);
        // Check if the last message in the conversation history is an assistant response
        const lastMessage = conversation[conversation.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === text) {
            console.log('Skipping duplicate response:', text);
            return;
        }
        // Construct the messages array with user messages and assistant responses (excluding previous assistant responses)
        const userMessages = conversation.filter(message => message.role === 'user');
        const assistantResponses = conversation.filter(message => message.role === 'assistant');
        const filteredAssistantResponses = assistantResponses.slice(-1); // Get the last assistant response
        console.log(userMessages);
        // Construct the messages array with the conversation history and user message
        const messages = [
            { role: 'system', content: 'You are an intelligent assistant.' },
            ...userMessages,
            ...assistantResponses,
            ...filteredAssistantResponses,
            { role: 'user', content: text },
        ];

        const openaiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.7,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`,
                },
            }
        );

        const generatedResponse = openaiResponse.data.choices[0].message.content.trim();
        
        // Now send the generated response back to the user
        const facebookResponse = await axios.post(
            `https://graph.facebook.com/v17.0/104119296099196/messages?access_token=${token}`,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: {
                    body: generatedResponse,
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('OpenAI Response:', generatedResponse);
        console.log('Facebook Response:', facebookResponse.data);

        // Add assistant response to the conversation history
        conversations[to].push({ role: "assistant", content: generatedResponse });
        return generatedResponse;

    } catch (error) {
        console.error('Error:', error);
    }
}

async function langchain_model(to: string, text: string, token: string, openaiApiKey: string) {
    try{

        const model = new OpenAI({
            modelName: "gpt-3.5-turbo",
            temperature: 0,
            maxTokens: 3000,
            openAIApiKey: openaiApiKey,
        });
        console.log(pastMessages);

        const currentDate = moment.tz('Asia/Kolkata').format('YYYY-MM-DD');
        console.log(currentDate);

        const memory = new BufferMemory({
            chatHistory: new ChatMessageHistory(pastMessages),
        });
        const chain = new ConversationChain({ llm: model, memory: memory });
        const res1 = await chain.call({ input: "If the following message is about scheduling events in a calendar, provide the following information one by one: Title, Time, Length (if present), and Date (if today is "+currentDate+"). Otherwise please dont ask anything about the meeting details and give the assistance about the question.\n\n"+text });
        console.log({ res1 });
    
        // Extract the generated response from the result
        const generatedResponse = res1.response.trim();
        console.log(generatedResponse); 
        
        // Now send the generated response back to the user
        const facebookResponse = await axios.post(
            `https://graph.facebook.com/v17.0/104119296099196/messages?access_token=${token}`,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: {
                    body: generatedResponse,
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    
        console.log('OpenAI Response:', generatedResponse);
        console.log('Facebook Response:', facebookResponse.data);
    
        // Add assistant response to the conversation history
        conversations[to].push({ role: "assistant", content: generatedResponse });
        return generatedResponse;

    } catch (error) {
        console.error('Error:', error);
    }
}


export default { parse_message };
