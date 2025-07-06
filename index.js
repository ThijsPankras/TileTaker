import axios from 'axios';
import fs from 'fs/promises';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import polyline from '@mapbox/polyline';

dotenv.config();

const PORT = 3000;
const app = express();

let tilesData = [];
let tilesIndex = {};
const users = {};
let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

// Load and validate tiles.json
async function loadTiles() {
  try {
    const fileData = await fs.readFile('tiles.json', 'utf8');
    const parsed = JSON.parse(fileData);
    if (!Array.isArray(parsed)) {
      console.warn('⚠️ tiles.json did not contain an array. Resetting.');
      return [];
    }
    console.log(`Loaded ${parsed.length} tiles from tiles.json`);
    return parsed;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No existing tiles.json found, starting with empty tile set.');
    } else {
      console.error('Error reading tiles.json:', err);
    }
    return [];
  }
}

// Load token from token.json
async function loadToken() {
  try {
    const data = await fs.readFile('token.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ Failed to load token.json:', err.message);
    process.exit(1);
  }
}

// Main logic
(async () => {
  const token = await loadToken();
  const STRAVA_TOKEN = token.access_token;
  if (!STRAVA_TOKEN) {
    console.error("❌ No valid access token found in token.json.");
    process.exit(1);
  }

  tilesData = await loadTiles();

  // Build quick index
  tilesData.forEach(tile => {
    tilesIndex[`${tile.x},${tile.y}`] = tile.owner;
  });

  try {
    const profileRes = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${STRAVA_TOKEN}` }
    });
    const athlete = profileRes.data;
    const displayName = `${athlete.firstname} ${athlete.lastname}`;
    const athleteId = athlete.id;

    users[displayName] = {
      id: athleteId,
      name: displayName,
      color: null,
      tileCount: 0,
      activityCount: 0,
      routes: []
    };

    for (const tile of tilesData) {
      const ownerName = tile.owner;
      if (!users[ownerName]) {
        users[ownerName] = {
          id: null,
          name: ownerName,
          color: null,
          tileCount: 0,
          activityCount: 0,
          routes: []
        };
      }
    }

    const activitiesRes = await axios.get('https://www.strava.com/api/v3/athlete/activities?per_page=200', {
      headers: { Authorization: `Bearer ${STRAVA_TOKEN}` }
    });
    const activities = activitiesRes.data;
    users[displayName].activityCount = activities.length;

    for (const activity of activities) {
      if (!activity.map || !activity.map.summary_polyline) continue;
      const coords = polyline.decode(activity.map.summary_polyline);
      users[displayName].routes.push(coords);
      const activityTimestamp = new Date(activity.start_date).toISOString();

      for (const [lat, lon] of coords) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;

        const xTile = Math.floor((lon + 180) / 360 * Math.pow(2, 14));
        const yTile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, 14));
        const tileKey = `${xTile},${yTile}`;

        if (!(tileKey in tilesIndex)) {
          // New tile
          tilesIndex[tileKey] = displayName;
          tilesData.push({
            x: xTile,
            y: yTile,
            owner: displayName,
            timestamp: activityTimestamp
          });
        } else {
          // Existing tile: update timestamp if missing
          const existingTile = tilesData.find(t => t.x === xTile && t.y === yTile && t.owner === displayName);
          if (existingTile && !existingTile.timestamp) {
            existingTile.timestamp = activityTimestamp;
          }
        }
      }
    }

    Object.values(users).forEach(u => u.tileCount = 0);
    for (const tile of tilesData) {
      const owner = tile.owner;
      if (users[owner]) {
        users[owner].tileCount += 1;
      }
    }

    const colorPalette = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe'];
    let colorIndex = 0;
    for (const uname in users) {
      users[uname].color = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }

    await fs.writeFile('tiles.json', JSON.stringify(tilesData, null, 2), 'utf-8');
    console.log(`✅ tiles.json updated (${tilesData.length} tiles total).`);

    app.use(express.static(path.join(process.cwd(), 'public')));

// Assign lastTileTimestamp per user based on tiles
Object.values(users).forEach(user => {
  const userTiles = tilesData.filter(tile => tile.owner === user.name && tile.timestamp);
  if (userTiles.length > 0) {
    const latest = userTiles.reduce((latest, tile) => {
      return new Date(tile.timestamp) > new Date(latest.timestamp) ? tile : latest;
    });
    user.lastTileTimestamp = latest.timestamp;
  } else {
    user.lastTileTimestamp = null;
  }
});


    app.get('/data', (req, res) => {
      const responseData = {
        bounds: { minLat, minLon, maxLat, maxLon },
        tiles: tilesData,
        users: Object.values(users)
      };
      res.json(responseData);
    });

    app.listen(PORT, () => {
      console.log(`🚀 TileTaker server running at http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ Error during Strava data fetch or processing:', err);
  }
})();
