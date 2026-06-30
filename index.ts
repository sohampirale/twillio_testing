import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import twilio from 'twilio';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !twilioWhatsappNumber) {
  console.error('❌ Missing Twilio environment variables! Please check your .env file.');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// Twilio webhooks send data as application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * POST /webhooks/twilio/whatsapp
 * Receives incoming WhatsApp messages from Twilio Sandbox.
 */
app.post('/webhooks/twilio/whatsapp', async (req: Request, res: Response) => {
  try {
    const { From, To, Body, MessageSid } = req.body;

    // Log the incoming message details
    console.log('📥 Received WhatsApp Webhook:');
    console.log(`   - MessageSid: ${MessageSid}`);
    console.log(`   - From: ${From}`);
    console.log(`   - To: ${To}`);
    console.log(`   - Body: "${Body}"`);

    // 1. Generate the immediate TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Hey, got your message.');

    // 2. Respond immediately to the webhook
    res.type('text/xml').status(200).send(twiml.toString());

    // 3. Send the second message asynchronously after responding to the webhook
    setImmediate(async () => {
      try {
        console.log(`📤 Sending asynchronous follow-up message to ${From}...`);
        const message = await client.messages.create({
          from: twilioWhatsappNumber, // Typically "whatsapp:+14155238886" (Sandbox number)
          to: From, // The user who messaged us
          body: 'This is my second reply sent through the Twilio API.',
        });
        console.log(`✅ Asynchronous message sent successfully. SID: ${message.sid}`);
      } catch (error) {
        console.error('❌ Failed to send asynchronous WhatsApp message:', error);
      }
    });

  } catch (error) {
    console.error('❌ Error handling WhatsApp webhook:', error);
    // In case of error before response is sent, send a server error.
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`👉 Webhook endpoint: http://localhost:${port}/webhooks/twilio/whatsapp`);
});