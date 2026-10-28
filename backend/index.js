// index.js
require('dotenv').config(); // MUST BE AT THE VERY TOP

const express = require('express');
const cors = require('cors');
const supabase = require('./lib/supabase');
const { parseObligationText } = require('./src/services/obligation-parser.service');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Allow requests from the frontend origin
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Cuenuvo Reminder Tracker API' });
});

const DEPLOY_COLOR = process.env.DEPLOY_COLOR || 'unknown';

app.get('/api/info', (req, res) => {
  res.json({
    deployColor: DEPLOY_COLOR,
    nodeVersion: process.version,
    uptime: process.uptime(),
  });
});

const notificationRoutes = require('./routes/notifications');
app.use('/api', notificationRoutes);

// Temporary direct route test in index.js
app.post('/api/notifications/action', async (req, res) => {
    const { reminderId, actionId } = req.body;
    console.log(`[Webhook Test] Received reminderId: ${reminderId}, actionId: ${actionId}`);
    return res.status(200).json({ success: true, message: 'Action processed successfully!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Voice Parsing Endpoint for Cuenuvo (Powered by Unified Parser Service)
app.post('/api/parse-voice', async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript string is required' });
    }

    const parsedData = await parseObligationText(transcript);
    
    // Map due_time to reminder_time for frontend web compatibility
    parsedData.reminder_time = parsedData.due_time || '09:00';

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error('Groq voice parsing error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process voice request' });
  }
});

// Echo endpoint
app.post('/api/echo', (req, res) => {
  const { text } = req.body;
  res.json({ youSaid: text });
});

// Mount the Modular WhatsApp Router
const whatsappRouter = require('./src/channels/whatsapp/whatsapp.router');
app.use('/whatsapp', whatsappRouter);

app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://${HOST}:${PORT}`);
});