// src/channels/whatsapp/whatsapp.service.js

const WHATSAPP_API_VERSION = 'v21.0';

function getCredentials() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error('❌ Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
    return null;
  }
  return { accessToken, phoneNumberId };
}

async function sendWhatsAppRequest(payloadBody) {
  const creds = getCredentials();
  if (!creds) return false;

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${creds.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadBody),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('❌ Meta API send error:', JSON.stringify(result, null, 2));
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Error sending WhatsApp request:', error);
    return false;
  }
}

/**
 * Send a basic text message
 */
async function sendWhatsAppText(toPhone, text) {
  return sendWhatsAppRequest({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhone,
    type: 'text',
    text: { preview_url: false, body: text },
  });
}

/**
 * Send interactive reply buttons (Max 3 buttons)
 * buttons format: [{ id: 'BTN_TODAY', title: 'Today' }, ...]
 */
async function sendInteractiveButtons(toPhone, bodyText, buttons) {
  return sendWhatsAppRequest({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title.substring(0, 20) }, // Meta max 20 chars
        })),
      },
    },
  });
}

/**
 * Send an interactive list message (For lists of reminders)
 * rows format: [{ id: 'REMIND_ID_1', title: 'Electricity Bill', description: '₹1,500 · 10:00 AM' }]
 */
async function sendInteractiveList(toPhone, headerText, bodyText, buttonText, rows) {
  return sendWhatsAppRequest({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toPhone,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      action: {
        button: buttonText.substring(0, 20),
        sections: [
          {
            title: 'Reminders',
            rows: rows.slice(0, 10).map((row) => ({
              id: row.id,
              title: row.title.substring(0, 24), // Meta max 24 chars
              description: row.description ? row.description.substring(0, 72) : undefined,
            })),
          },
        ],
      },
    },
  });
}

module.exports = {
  sendWhatsAppText,
  sendInteractiveButtons,
  sendInteractiveList,
};