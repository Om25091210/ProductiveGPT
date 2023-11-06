const { AssemblyAI } = require('assemblyai');

// Initialize the AssemblyAI client
const client = new AssemblyAI({
  apiKey: '2b5a64d3c4e54407902a3e75d90609b2', // Replace with your API key
});

// Function to transcribe audio from a given URL
async function transcribeAudioFromURL(audioURL:string) {
  try {
    // Request parameters with speaker_labels enabled
    const data = {
      audio_url: audioURL,
      speaker_labels: true,
    };

    // Create a transcript
    const transcript = await client.transcripts.create(data);

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
  } catch (error) {
    console.error('Transcription Error:', error);
    throw error; // You can handle the error as per your requirements
  }
}

export default transcribeAudioFromURL;