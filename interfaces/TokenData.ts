interface TokenData {
    access_token: string,
    refresh_token: string,
    scope: string,
    token_type: string,
    expiry_date : bigint
  }

export default TokenData;