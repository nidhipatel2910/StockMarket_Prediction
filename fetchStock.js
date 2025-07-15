const fetch = require('node-fetch');
const fs = require('fs');

const API_KEY = '517d40f17afa4499a7ac512829fcde96';
const SYMBOL = 'AAPL';
const RANGE = 30;

const url = `https://api.twelvedata.com/time_series?symbol=${SYMBOL}&interval=1day&outputsize=${RANGE}&apikey=${API_KEY}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (!data.values) {
      console.error('Error fetching data:', data);
      return;
    }
    const prices = data.values.map(item => parseFloat(item.close)).reverse();
    fs.writeFileSync('stockdata.json', JSON.stringify(prices, null, 2));
    console.log('Stock data saved to stockdata.json');
  })
  .catch(err => console.error('Fetch error:', err));
