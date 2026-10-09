// backend/routes/whatsappWebhook.js
import express from 'express';

const router = express.Router();

const VERIFY_TOKEN = 'krona_whatsapp_verify_2026';

// GET: Meta verifies the webhook
router.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  console.log('❌ WhatsApp webhook verification failed', { mode, token });
  return res.sendStatus(403);
});

// POST: receive messages & events
router.post('/whatsapp/webhook', (req, res) => {
  const body = req.body;

  // Acknowledge immediately
  res.sendStatus(200);

  // Basic logging for now
  console.log('📨 WhatsApp webhook payload:', JSON.stringify(body, null, 2));

  // We'll add message handling & "Pending Today" logic in the next step
});

export default router;