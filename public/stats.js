// stats.js

// Helper: group array items by key
function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

fetch('/data')
  .then(res => res.json())
  .then(data => {
    const me = data.users.find(u => u.name.includes("Thijs"));
    if (!me) return;

    const myTiles = data.tiles.filter(t => t.owner === me.name);
    const dates = myTiles.map(t => new Date(t.timestamp));

    // Summary data
    const first = new Date(Math.min(...dates));
    const last = new Date(Math.max(...dates));
    const activeDays = [...new Set(dates.map(d => d.toDateString()))];

    const dateCounts = groupBy(dates, d => d.toISOString().split('T')[0]);
    const mostTilesDay = Object.entries(dateCounts).reduce((a, b) => b[1].length > a[1].length ? b : a);

    const streak = getStreak(dates);

    // Render summary
    document.getElementById('summary').innerHTML = `
      <h2>📊 Your Tile Stats</h2>
      <p><strong>Total Tiles:</strong> ${myTiles.length}</p>
      <p><strong>First Tile:</strong> ${first.toDateString()}</p>
      <p><strong>Most Recent Tile:</strong> ${last.toDateString()}</p>
      <p><strong>Most Tiles in a Day:</strong> ${mostTilesDay[1].length} on ${mostTilesDay[0]}</p>
      <p><strong>Active Days:</strong> ${activeDays.length}</p>
      <p><strong>Longest Streak:</strong> ${streak} days</p>
    `;

    // Tiles per day
    const tileCounts = Object.entries(dateCounts).sort(([a], [b]) => new Date(a) - new Date(b));
    new Chart(document.getElementById('tilesPerDay'), {
      type: 'bar',
      data: {
        labels: tileCounts.map(([d]) => d),
        datasets: [{
          label: 'Tiles',
          data: tileCounts.map(([, arr]) => arr.length),
          backgroundColor: '#4363d8'
        }]
      }
    });

    // Day of Week Chart
    const dowCount = [0,0,0,0,0,0,0];
    dates.forEach(d => dowCount[d.getDay()]++);
    new Chart(document.getElementById('dayOfWeekChart'), {
      type: 'bar',
      data: {
        labels: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
        datasets: [{
          label: 'Activity Count',
          data: dowCount,
          backgroundColor: '#3cb44b'
        }]
      }
    });

    // Bounds box
    document.getElementById('boundsBox').textContent = `SW (${data.bounds.minLat.toFixed(2)}, ${data.bounds.minLon.toFixed(2)}), NE (${data.bounds.maxLat.toFixed(2)}, ${data.bounds.maxLon.toFixed(2)})`;

    // TODO placeholders
    document.getElementById('longestDistance').textContent = 'Not yet available';
    document.getElementById('maxSpeed').textContent = 'Not yet available';
    document.getElementById('totalDistance').textContent = 'Not yet available';
    document.getElementById('totalTime').textContent = 'Not yet available';
    document.getElementById('avgElevation').textContent = 'Not yet available';
    document.getElementById('startLoc').textContent = 'Not yet available';
    document.getElementById('firstDate').textContent = first.toDateString();
    document.getElementById('lastDate').textContent = last.toDateString();
    document.getElementById('streak').textContent = `${streak} days`;
    document.getElementById('avgSpeed').textContent = 'Not yet available';
    document.getElementById('startCount').textContent = 'Not yet available';
    document.getElementById('tilesPer100km').textContent = 'Not yet available';
    document.getElementById('tilesOneDay').textContent = `${mostTilesDay[1].length} on ${mostTilesDay[0]}`;
    document.getElementById('busiestWeek').textContent = 'Not yet available';
    document.getElementById('maxElev').textContent = 'Not yet available';
    document.getElementById('nsvswe').textContent = 'Not yet available';
  });

function getStreak(dates) {
  const set = new Set(dates.map(d => d.toISOString().split('T')[0]));
  const sorted = Array.from(set).map(d => new Date(d)).sort((a, b) => a - b);
  let max = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const diff = (curr - prev) / 86400000;
    if (diff === 1) current++;
    else current = 1;
    if (current > max) max = current;
  }
  return max;
}
