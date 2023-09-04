import { Response, Request, NextFunction } from "express";
import axios from "axios";
import event_controller from '../controllers/set_event';
require("dotenv").config();

const token = process.env.TOKEN as string;
const openaiApiKey = process.env.OPENAPI as string;

// Maintain conversation context globally
const conversations: { [key: string]: any[] } = {};

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

                if (!conversations[from]) {
                    conversations[from] = [];
                }

                // Add user message to the conversation history
                conversations[from].push({ role: "user", content: userMessage });
                // Check if the user mentioned "set reminder"
                // if(userMessage.toLowerCase().includes("set")){
                //     await event_controller.create_event(req,from,token,userMessage,res, async () => {
                //         // Call your function to send the authUrl as a WhatsApp message
                //         await send_calendar_msg(from, "Event created successfully!!", token);
                //     });
                //     console.log("triggered");
                // }
                if (userMessage.toLowerCase().includes("set reminder")) {
                    //TODO: Check the user token to skip verification process;
                    // Call the verify_consent middleware
                    await event_controller.verify_consent(req, res, async () => {
                        // Access the authUrl from the req object
                        const authUrl:string = req.authUrl as string;
                        // Call your function to send the authUrl as a WhatsApp message
                        await send_calendar_msg(from, authUrl, token);
                    });
                    const format:string = `
                            Please provide the following information for the meeting in this format:\nset\n1. Title of the meeting:\n2. Meeting time (in 12-hour format, e.g., 7:30pm-8:00pm):\n3. Include Google Meet link? (yes/no).
                            `;
                    await send_calendar_msg(from, format, token);
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
                        await event_controller.create_event(from,token,parsedMeeting,req, res, async () => {
                            // Call your function to send the authUrl as a WhatsApp message
                            await send_calendar_msg(from, "Event created successfully!!", token);
                        });
                    } else {
                    console.log("Invalid time format");
                    }
                } 
                else {
                    // Call your modified sendMessage function
                    await sendMessage(from, userMessage, token, openaiApiKey);
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
        // Construct the messages array with user messages and assistant responses (excluding previous assistant responses)
        const userMessages = conversation.filter(message => message.role === 'user');
        const assistantResponses = conversation.filter(message => message.role === 'assistant');
        const filteredAssistantResponses = assistantResponses.slice(-1); // Get the last assistant response
        // Construct the messages array with the conversation history and user message
        const messages = [
            { role: 'system', content: 'You are an intelligent assistant.' },
            ...userMessages,
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

    } catch (error) {
        console.error('Error:', error);
    }
}

export default { parse_message };
