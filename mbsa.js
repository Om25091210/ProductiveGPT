const { OpenAI } = require("langchain/llms/openai");

const llm = new OpenAI({
  temperature: 0.9,
  openAIApiKey: "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",
});

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

// Example usage:
const startTime = "5:00 PM";
const durationMinutes = 75;

const endTime = calculateEndTime(startTime, durationMinutes);
console.log("End Time:", endTime); // Output: "End Time: 6:15 PM"

// const mbsa  = async() =>{
//       let init = "Work on the investor deck tomorrow at 5pm for 75 min and also give me 5 tips for python and formula for potassium carbonate"
//       const text =
//         `Process the following statement "${init}" and then return me the response in the following format JSON({'answer': your response, 'type': General(if the statement is general)/ Meeting(if statement is related to scheduling meeting otr anything related to meetings)}). If there are more than one sentences in the statement, return me as list of JSONs.`;
//       const llmResult = await llm.predict(text);
//       console.log(llmResult)
//   }
//   mbsa()
/*
  "Feetful of Fun"
*/

