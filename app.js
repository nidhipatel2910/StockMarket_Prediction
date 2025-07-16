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

function updateStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.className = isError ? 'error' : '';
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
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: '#667eea',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      fill: false,
    }
  ];
  
  if (predicted !== null) {
    labels.push('Predicted');
    datasets.push({
      label: 'Predicted Price',
      data: Array(prices.length).fill(null).concat([predicted]),
      borderColor: '#f56565',
      backgroundColor: '#f56565',
      pointRadius: 8,
      pointBackgroundColor: '#f56565',
      pointBorderColor: '#fff',
      pointBorderWidth: 3,
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
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                weight: '600'
              }
            }
          },
          tooltip: { 
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#667eea',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { 
              display: true, 
              text: 'Price ($)',
              font: {
                size: 14,
                weight: '600'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            title: { 
              display: true, 
              text: 'Date',
              font: {
                size: 14,
                weight: '600'
              }
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 11
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
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
    updateStatus('Please enter a stock symbol', true);
    return;
  }
  
  updateStatus('🔄 Fetching real-time market data...');
  fetchBtn.disabled = true;
  
  try {
    const response = await fetch(`http://localhost:3000/api/stock/${symbol}?days=30`);
    const data = await response.json();
    
    if (data.error) {
      updateStatus(`❌ Error: ${data.error}`, true);
      fetchBtn.disabled = false;
      return;
    }
    
    historicalPrices = data.prices;
    historicalDates = data.dates;
    chartTitle.textContent = `${data.symbol} Stock Price Analysis`;
    updateStatus(`✅ Successfully loaded ${data.symbol} data (${data.prices.length} days)`);
    predictBtn.disabled = false;
    renderChart(historicalPrices, historicalDates);
    
  } catch (err) {
    updateStatus('❌ Connection error. Please ensure the server is running on localhost:3000', true);
    console.error('Fetch error:', err);
  } finally {
    fetchBtn.disabled = false;
  }
};

// Predict next price
predictBtn.onclick = function() {
  if (historicalPrices.length < 3) {
    updateStatus('❌ Need at least 3 data points for prediction', true);
    return;
  }
  
  updateStatus('🧠 Training AI model and analyzing patterns...');
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
    
    updateStatus(`🎯 Predicted next price: $${predicted}`);
    renderChart(historicalPrices, historicalDates, predicted);
    predictBtn.disabled = false;
  }, 1500);
};

// Initialize empty chart
renderChart([]);