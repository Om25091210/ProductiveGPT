const dotenv = require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const filePath = "config/audio.mp3";
const model = "whisper-1";

const formData = new FormData();
formData.append("model", model);
formData.append("file", fs.createReadStream(filePath));

axios
  .post("https://api.openai.com/v1/audio/transcriptions", formData, {
    headers: {
      Authorization: `Bearer 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`,
      "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
    },
  })
  .then((response) => {
    console.log(response.data);
  });