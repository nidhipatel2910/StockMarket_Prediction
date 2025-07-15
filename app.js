// Get DOM elements
const stockSymbolInput = document.getElementById('stockSymbol');
const fetchBtn = document.getElementById('fetchBtn');
const predictBtn = document.getElementById('predictBtn');
const statusDiv = document.getElementById('status');
const chartTitle = document.getElementById('chartTitle');
const chartCanvas = document.getElementById('stockChart');

let net = null;
let historicalPrices = [];
let historicalDates = [];
let stockChart = null;

// Prepare training data for Brain.js
function prepareData(prices) {
  const data = [];
  for (let i = 0; i < prices.length - 2; i++) {
    data.push({
      input: [prices[i] / 1000, prices[i + 1] / 1000],
      output: [prices[i + 2] / 1000]
    });
  }
  return data;
}

function renderChart(prices, dates = [], predicted = null) {
  // Use dates if available, otherwise use generic labels
  const labels = dates.length > 0 
    ? dates.map(date => new Date(date).toLocaleDateString())
    : prices.map((_, i) => `Day ${i + 1}`);
    
  let datasets = [
    {
      label: 'Historical Prices',
      data: prices,
      borderColor: '#1976d2',
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      tension: 0.2,
      pointRadius: 4,
      fill: false,
    }
  ];
  
  if (predicted !== null) {
    labels.push('Predicted');
    datasets.push({
      label: 'Predicted Price',
      data: Array(prices.length).fill(null).concat([predicted]),
      borderColor: '#d32f2f',
      backgroundColor: '#d32f2f',
      pointRadius: 7,
      pointBackgroundColor: '#d32f2f',
      showLine: false,
      fill: false,
      type: 'line',
    });
  }
  
  if (stockChart) {
    stockChart.data.labels = labels;
    stockChart.data.datasets = datasets;
    stockChart.update();
  } else {
    stockChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: { enabled: true }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: 'Price ($)' }
          },
          x: {
            title: { display: true, text: 'Date' },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });
  }
}

// Fetch historical data from backend
fetchBtn.onclick = async function() {
  const symbol = stockSymbolInput.value.trim().toUpperCase();
  if (!symbol) {
    statusDiv.textContent = 'Please enter a stock symbol.';
    return;
  }
  
  statusDiv.textContent = 'Fetching real-time data...';
  fetchBtn.disabled = true;
  
  try {
    const response = await fetch(`http://localhost:3000/api/stock/${symbol}?days=30`);
    const data = await response.json();
    
    if (data.error) {
      statusDiv.textContent = `Error: ${data.error}`;
      fetchBtn.disabled = false;
      return;
    }
    
    historicalPrices = data.prices;
    historicalDates = data.dates;
    chartTitle.textContent = `${data.symbol} Stock Prices`;
    statusDiv.textContent = `Showing latest prices for ${data.symbol}`;
    predictBtn.disabled = false;
    renderChart(historicalPrices, historicalDates);
    
  } catch (err) {
    statusDiv.textContent = 'Error fetching data. Make sure the server is running on localhost:3000';
    console.error('Fetch error:', err);
  } finally {
    fetchBtn.disabled = false;
  }
};

// Predict next price
predictBtn.onclick = function() {
  if (historicalPrices.length < 3) {
    statusDiv.textContent = 'Need at least 3 data points for prediction.';
    return;
  }
  
  statusDiv.textContent = 'Training model and predicting...';
  predictBtn.disabled = true;
  
  setTimeout(() => {
    const trainingData = prepareData(historicalPrices);
    net = new brain.NeuralNetwork({ hiddenLayers: [4, 4] });
    
    net.train(trainingData, {
      iterations: 2000,
      errorThresh: 0.005,
      log: false
    });
    
    // Predict next price
    const input = [
      historicalPrices[historicalPrices.length - 2] / 1000,
      historicalPrices[historicalPrices.length - 1] / 1000
    ];
    const output = net.run(input);
    const predicted = Math.round(output[0] * 1000 * 100) / 100;
    
    statusDiv.textContent = `Predicted next price: $${predicted}`;
    renderChart(historicalPrices, historicalDates, predicted);
    predictBtn.disabled = false;
  }, 1500);
};

// Initialize empty chart
renderChart([]);