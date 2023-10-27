interface Data {
    id: string;
    source: string;
    type: string;
    payload: {
      text: string;
    };
    sender: {
      phone: string;
      name: string;
      country_code: string;
      dial_code: string;
    };
}

export default Data;