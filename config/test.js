require('dotenv').config();
const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

async function createTranscription(audioFileName) {
	const resp = await openai.createTranscription(
	  fs.createReadStream(audioFileName),
	  "whisper-1",
	  "en-US"
	);

	return resp.data.text;
}

async function main() {
	try {
		const audioFileName = 'config/audio.mp3';
		const transcription = await createTranscription(audioFileName);
		console.log(transcription);
	} catch (e) {
		console.error(e);
	}
}

main();