import TokenData from "./TokenData";

interface ParsedMeeting {
    title: string,
    startTime: string,
    endTime: string,
    googleMeet: string,
    dbtoken? : TokenData
  }

export default ParsedMeeting;