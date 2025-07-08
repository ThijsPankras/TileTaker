import axios from 'axios';
import fs from 'fs/promises';

const CLIENT_ID = '166936';
const CLIENT_SECRET = 'd1d691fe1cf08ea661e68da7f8d39307c7e8a1bc';

async function refreshToken() {
  const tokenData = JSON.parse(await fs.readFile('token.json', 'utf8'));
  const refresh_token = tokenData.refresh_token;

  const res = await axios.post('https://www.strava.com/api/v3/oauth/token', null, {
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token
    }
  });

  console.log('✅ New token:', res.data);
  await fs.writeFile('token.json', JSON.stringify(res.data, null, 2), 'utf8');
  console.log('✅ token.json updated.');
}

refreshToken().catch(console.error);
