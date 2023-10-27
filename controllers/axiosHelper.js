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
const axios_1 = __importDefault(require("axios"));
require("dotenv").config();
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const db_1 = __importDefault(require("../db"));
const set_event_1 = __importDefault(require("../controllers/set_event"));
const openai_1 = require("langchain/llms/openai");
const memory_1 = require("langchain/memory");
const schema_1 = require("langchain/schema");
const chains_1 = require("langchain/chains");
//Getting APIKEY from env
const clientKey = process.env.APIKEY;
const openaiApiKey = process.env.OPENAPI;
//initialize a list for storing messages.
const conversations = {};
let pastMessages = [];
const sendAxiosRequest = (from, payload, req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let userMessage = payload.payload.text;
    // Initialize conversations when a new session starts
    if (!conversations[from]) {
        // Fetch and format past conversation data from the database
        let previous_data = yield db_1.default.conversation.findMany({
            where: { phone_no: from }
        });
        conversations[from] = [];
        pastMessages = pastMessages.concat(...previous_data.map(conversation1 => [
            new schema_1.HumanMessage(conversation1.user_reply),
            new schema_1.AIMessage(conversation1.ai_reply),
        ]));
    }
    let response = yield sendMessage(from, userMessage, openaiApiKey);
    const dataArray = JSON.parse(response);
    const extractedData = dataArray.map((item) => {
        if (item.type.toLowerCase() === "meeting") {
            console.log(item.type.toLowerCase());
            validate_response(item, from, req, res);
        }
        else {
            send_calendar_msg(from, item.answer);
        }
    });
    // await prisma.conversation.create({
    //             data: {
    //                 date: new Date(), // You can set the date as needed.
    //                 phone_no: from,
    //                 user_reply: userMessage, // Set the user timestamp as needed.
    //                 ai_reply: response,  // Set the AI timestamp as needed.
    //                 user: { connect: { id: user.id } }, // Connect the conversation to the user.
    //             },
    //     });
    try {
        return extractedData;
    }
    catch (error) {
        throw error;
    }
});
function validate_response(inputString, from, req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("The input we got for validating -", inputString);
        // Define regular expressions for extracting title, time, length, and date
        let meetingData = inputString;
        const length = meetingData.meetinglength ? meetingData.meetinglength : "30 minutes"; // Default to 30 minutes if not specified
        //TODO: Check the user token to skip verification process;
        let user_tokenDB = yield db_1.default.users.findFirst({
            where: { phone_no: from }
        });
        console.log(user_tokenDB === null || user_tokenDB === void 0 ? void 0 : user_tokenDB.token);
        if ((user_tokenDB === null || user_tokenDB === void 0 ? void 0 : user_tokenDB.token) != null && (user_tokenDB === null || user_tokenDB === void 0 ? void 0 : user_tokenDB.token.access_token) === '') {
            // Call the verify_consent middleware
            yield set_event_1.default.verify_consent(from, req, res, () => __awaiter(this, void 0, void 0, function* () {
                // Access the authUrl from the req object
                const authUrl = req.authUrl;
                // Call your function to send the authUrl as a WhatsApp message
                yield send_calendar_msg(from, authUrl);
            }));
        }
        else if ((user_tokenDB === null || user_tokenDB === void 0 ? void 0 : user_tokenDB.token) != null) {
            const endTime = calculateEndTime(inputString.time, parseInt(inputString.meetinglength, 10));
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
                    dbtoken: user_tokenDB === null || user_tokenDB === void 0 ? void 0 : user_tokenDB.token
                };
                yield set_event_1.default.create_event(parsedMeeting, req, res, () => __awaiter(this, void 0, void 0, function* () {
                    // Call your function to send the authUrl as a WhatsApp message
                    yield send_calendar_msg(from, req.authUrl);
                }));
            }
            else {
                console.log("Invalid time format");
            }
        }
    });
}
function send_calendar_msg(to, text) {
    return __awaiter(this, void 0, void 0, function* () {
        // Send a text message
        const sourceName = "ProductiveGPT";
        const axiosConfig = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "apikey": clientKey,
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
            const response = yield axios_1.default.post("https://api.gupshup.io/wa/api/v1/msg", postData, axiosConfig);
            return response;
        }
        catch (error) {
            throw error;
        }
    });
}
function calculateEndTime(startTime, durationMinutes) {
    // Parse the start time
    const [time, period] = startTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    // Convert start time to total minutes
    let totalMinutes = hours * 60 + minutes;
    // Add the duration
    totalMinutes += durationMinutes;
    // Calculate the end time
    let endHours = Math.floor(totalMinutes / 60);
    let endMinutes = totalMinutes % 60;
    // Adjust for the 12-hour clock
    if (period === 'PM' && endHours < 12) {
        endHours += 12;
    }
    // Format the result in 12-hour time format
    const endPeriod = endHours >= 12 ? 'PM' : 'AM';
    endHours = endHours % 12 || 12; // Ensure 12:00 PM or AM is displayed as is
    return `${endHours}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;
}
function sendMessage(to, text, openaiApiKey) {
    return __awaiter(this, void 0, void 0, function* () {
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
            const userMessages = conversation.filter(message => message.role === 'user');
            const assistantResponses = conversation.filter(message => message.role === 'assistant');
            const filteredAssistantResponses = assistantResponses.slice(-1); // Get the last assistant response
            const currentDate = moment_timezone_1.default.tz('Asia/Kolkata').format('YYYY-MM-DD');
            // Construct the messages array with the conversation history and user message
            const messages = [
                { role: 'system', content: `Process the following statement "${text}" and return the response in the following JSON format:

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
            
            - If the statement is general (not related to scheduling a meeting):
              {
                "answer": "Your response",
                "type": "General"
              }
            
            - If the statement contains multiple sentences, return a list of JSON objects for each sentence.
            
            Please note:
            - For the "meetinglength" field, if not provided, assume a default duration of 30 minutes. Add this duration to the start time and represent it in the same 12-hour format.
            - For the "date" field, if not provided, assume today's date.
            - If the statement contains multiple sentences, provide a list of JSON responses, one for each sentence.
            
            The response should follow this structure to provide clear and organized information based on the nature of the statement.`
                },
                ...userMessages,
                ...assistantResponses,
                ...filteredAssistantResponses,
                { role: 'user', content: text },
            ];
            const openaiResponse = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.7,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`,
                },
            });
            const generatedResponse = openaiResponse.data.choices[0].message.content.trim();
            console.log('OpenAI Response:', generatedResponse);
            // Add assistant response to the conversation history
            conversations[to].push({ role: "assistant", content: generatedResponse });
            return generatedResponse;
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
function langchain_model(to, text, openaiApiKey) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const model = new openai_1.OpenAI({
                modelName: "gpt-3.5-turbo",
                temperature: 0,
                maxTokens: 2500,
                openAIApiKey: openaiApiKey,
            });
            console.log(pastMessages);
            const currentDate = moment_timezone_1.default.tz('Asia/Kolkata').format('YYYY-MM-DD');
            console.log(currentDate);
            const memory = new memory_1.BufferMemory({
                chatHistory: new memory_1.ChatMessageHistory(pastMessages),
            });
            const chain = new chains_1.ConversationChain({ llm: model, memory: memory });
            const res1 = yield chain.call({
                input: `Process the following statement "${text}" and then return me the response ONLY in the following format JSON({'answer': your response, 'type': General(if the statement is general)/ Meeting(if statement is related to scheduling meeting otr anything related to meetings)}). If there are more than one sentences in the statement, return me as list of JSONs.`
                // input: "If your question is related to scheduling events in a calendar, please provide the details such as the title, time, length (default 30 min), and date (consider today is "+ currentDate +"). For example, you can say 'Schedule a meeting with John tomorrow at 3 PM for 1 hour.' If your question is not about scheduling events, you can ask any other question or request assistance, and I'll provide the answer.Return me the data in the following format JSON({'answer': The answer, 'type': General assistance / Meeting}). My Question"
            });
            console.log({ res1 });
            // Extract the generated response from the result
            const generatedResponse = res1.response.trim();
            console.log(generatedResponse);
            console.log('OpenAI Response:', generatedResponse);
            // Add assistant response to the conversation history
            conversations[to].push({ role: "assistant", content: generatedResponse });
            return generatedResponse;
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
exports.default = sendAxiosRequest;
