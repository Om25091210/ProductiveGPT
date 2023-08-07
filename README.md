# ProductiveGPT
# Chatbot for Whatsapp with OpenAI Integration

## WHY

Introducing our revolutionary chatbot integration that transforms your WhatsApp into a personal assistant, simplifying tasks, note-taking, and information retrieval. With the convenience of a friendly conversation, you can seamlessly send tasks and reminders, receive instant answers, and effortlessly manage your daily routine. No more complex apps or browser searches – just the power of productivity at your fingertips, available anytime and anywhere. Say hello to a new era of effortless efficiency. We open Whatsapp more than any app and more regularly, so why not having a chat which can be your personal assistent and not just a mere anonymous chat or message to self chat.

This project demonstrates the integration of a chatbot with Facebook Messenger's Graph API and OpenAI's GPT-3.5 language model. The chatbot can engage in conversations with users via Facebook Messenger and provide dynamic responses generated using the OpenAI API.

## Use Cases

1. **Automated Customer Support**: The chatbot can handle customer inquiries and provide instant responses, thereby improving customer satisfaction and reducing the load on support agents.

2. **Interactive Conversations**: Users can engage in interactive and context-aware conversations with the chatbot, making it useful for entertainment, information retrieval, and more.

## Development Setup

1. Clone the repository:

   ```bash
   git clone <repository_url>
   cd chatbot-facebook-openai

Install dependencies:
 
  ``` npm install ```

## install
Create a .env file in the root directory and add your environment variables:

```TOKEN=Your_Facebook_Page_Access_Token```
```OPENAPI=Your_OpenAI_API_Key```
```SECRET_KEY=Your_OpenAI_API_Key```

Start the server:

```npm start```

Set up your Facebook App and configure the WhatsApp webhook to receive messages from Facebook Messenger. Update the webhook URL in your Facebook App settings to point to your server's endpoint.

Your chatbot is now ready to receive messages from WhatsApp Messenger and respond using OpenAI's GPT-3.5 model.

## How it Works

1. When a user sends a message to your Facebook Page, the Facebook Graph API sends a webhook request to your server.

2. The server processes the incoming message, maintains the conversation context, and sends the message text to the OpenAI API.

3. The OpenAI API generates a response based on the conversation history and sends it back to the server.

4. The server sends the generated response to the user using the Facebook Graph API, closing the loop of the conversation.

## Future Improvements
1. Implement better error handling and retry mechanisms for API requests.
2. Enhance conversation context management to handle more complex interactions.
3. To enable the chatbot with analysis feature and to present visual data.
4. Can set-up remainders in google calendar or Schedule a meet.
5. Can track your TO-DO list and progress.

## Acknowledgments

This project is inspired by the capabilities of OpenAI's language models and the ease of integration with Facebook's Graph API. Special thanks to #MBSA for supporting the idea.
