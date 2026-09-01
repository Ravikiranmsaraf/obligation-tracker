const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Allow requests from the frontend origin (Codespaces / VM / localhost)
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

app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://${HOST}:${PORT}`);
});