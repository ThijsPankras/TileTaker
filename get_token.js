import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

// 👇 Replace with the code you got after logging in via the /login page
const AUTHORIZATION_CODE = '72dc052edd5799c0a1866e6e00400461398485f5';

async function exchangeToken() {
  try {
    const response = await axios.post('https://www.strava.com/api/v3/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: AUTHORIZATION_CODE,
      grant_type: 'authorization_code',
    });

    const token = response.data;
    await fs.writeFile('token.json', JSON.stringify(token, null, 2));
    console.log('✅ Token saved to token.json');
  } catch (error) {
    console.error('❌ Token exchange failed:', error.response?.data || error.message);
  }
}

exchangeToken();
