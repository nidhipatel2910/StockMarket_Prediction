const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for browser requests
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Your Twelve Data API key
const API_KEY = '517d40f17afa4499a7ac512829fcde96';

// API endpoint to fetch stock data
app.get('/api/stock/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { days = 30 } = req.query;
  
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=${days}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'error' || !data.values) {
      return res.status(400).json({ error: data.message || 'API error' });
    }
    
    // Extract closing prices and dates, most recent last
    const prices = data.values
      .map(item => parseFloat(item.close))
      .reverse();
    
    const dates = data.values
      .map(item => item.datetime)
      .reverse();
    
    res.json({ 
      symbol: symbol.toUpperCase(),
      prices: prices,
      dates: dates
    });
    
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/stock/SYMBOL`);
}); 