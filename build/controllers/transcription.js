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
Object.defineProperty(exports, "__esModule", { value: true });
const { AssemblyAI } = require('assemblyai');
// Initialize the AssemblyAI client
const client = new AssemblyAI({
    apiKey: '2b5a64d3c4e54407902a3e75d90609b2', // Replace with your API key
});
// Function to transcribe audio from a given URL
function transcribeAudioFromURL(audioURL) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Request parameters with speaker_labels enabled
            const data = {
                audio_url: audioURL,
                speaker_labels: true,
            };
            // Create a transcript
            const transcript = yield client.transcripts.create(data);
            // Extract and print the transcript text
            console.log('Transcript Text:');
            console.log(transcript.text);
            // Print speaker labels and their corresponding text
            // console.log('Speaker Labels:');
            // for (let utterance of transcript.utterances) {
            //   console.log(`Speaker ${utterance.speaker}: ${utterance.text}`);
            // }
            // Return the transcript object or text as needed
            return transcript.text;
        }
        catch (error) {
            console.error('Transcription Error:', error);
            throw error; // You can handle the error as per your requirements
        }
    });
}
exports.default = transcribeAudioFromURL;
