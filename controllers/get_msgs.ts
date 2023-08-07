import { Response, Request, NextFunction } from "express";
import axios from "axios";
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

                // Call your modified sendMessage function
                await sendMessage(from, userMessage, token, openaiApiKey);

                res.sendStatus(200);
                return;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        res.sendStatus(500);
    }
};

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
