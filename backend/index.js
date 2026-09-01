const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Allow requests from the frontend origin
app.use(
  cors({
    origin: true, // allows all origins for now; we can restrict later
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Obligation Tracker API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock obligations endpoint
app.get('/obligations', (req, res) => {
  const obligations = [
    {
      id: 1,
      name: 'Electricity Bill',
      category: 'Utilities',
      amount: 1200,
      dueDay: 5,
      status: 'pending',
    },
    {
      id: 2,
      name: 'Mobile Bill',
      category: 'Utilities',
      amount: 499,
      dueDay: 10,
      status: 'pending',
    },
    {
      id: 3,
      name: 'Car EMI',
      category: 'Loan',
      amount: 15000,
      dueDay: 15,
      status: 'paid',
    },
  ];
  res.json(obligations);
});

app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://${HOST}:${PORT}`);
});