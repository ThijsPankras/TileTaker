import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = 3000;

const clientId = process.env.STRAVA_CLIENT_ID;
const clientSecret = process.env.STRAVA_CLIENT_SECRET;
const redirectUri = 'http://localhost:3000/exchange_token';

app.get('/login', (req, res) => {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=read,activity:read_all`;
  res.redirect(authUrl);
});

app.get('/exchange_token', async (req, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      },
    });

    const { access_token, refresh_token, expires_at } = response.data;

    // Save to token.json
    const fs = await import('fs/promises');
    await fs.writeFile(
      'token.json',
      JSON.stringify({ access_token, refresh_token, expires_at }, null, 2)
    );

    res.send('✅ Token received and saved! You can close this tab.');
  } catch (error) {
    console.error('❌ Token exchange failed:', error.response?.data || error.message);
    res.status(500).send('❌ Token exchange failed. Check console.');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Auth server running at http://localhost:${PORT}/login`);
});
