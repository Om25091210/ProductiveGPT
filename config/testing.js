const axios = require('axios');
const fs = require('fs');
const speech = require('@google-cloud/speech');

// Replace with the URL of the audio file
const audioFileUrl = 'https://filemanager.gupshup.io/wa/c230660f-427a-46cb-b2a1-e7487e607142/wa/media/71867862-5302-4b17-8788-4f2c8ca7d8be?download=false';

// Create a SpeechClient with your service account key
const client = new speech.SpeechClient({
  keyFilename: 'config/keySpeechToText.json',
});

async function transcribeAudio() {
  try {
    const response = await axios.get(audioFileUrl, { responseType: 'arraybuffer' });

    const audioBuffer = Buffer.from(response.data);

    const request = {
      audio: {
        content: audioBuffer.toString('base64'),
      },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    const [result] = await client.recognize(request);
    const transcription = result.results.map((alternative) => alternative.alternatives[0].transcript).join('\n');

    console.log(`Transcription: ${transcription}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

transcribeAudio();
