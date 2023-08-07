import { Response, Request, NextFunction } from "express";
import axios from "axios";
require("dotenv").config();

const token = process.env.TOKEN as string;
const openaiApiKey = process.env.OPENAPI as string;

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

                // Get user message from the received webhook
                let userMessage = body_param.entry[0].changes[0].value.messages[0].text.body;
                console.log(userMessage);
                // Call your modified sendMessage function
                await sendMessage(from, userMessage,token ,openaiApiKey);

                res.sendStatus(200);
                return;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        res.sendStatus(500);
    }
};

async function sendMessage(to:string, text:string, token:string, openaiApiKey:string) {
    try {
        // Construct the messages array with the user message
        const messages = [
            {
                role: 'system',
                content: 'You are an intelligent assistant.',
            },
            {
                role: 'user',
                content: text,
            }
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

    } catch (error) {
        console.error('Error:', error);
    }
}

export default { parse_message };
