const twilio = require("twilio");

// Placeholders to be configured in environment or replaced at deploy time
// Use env if provided; otherwise leave undefined so runtime fails fast and logs clearly
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

async function sendSms({ to, body }) {
  if (!to) throw new Error("Missing 'to' for SMS");
  if (!body) throw new Error("Missing 'body' for SMS");
  if (!TWILIO_FROM_NUMBER || TWILIO_FROM_NUMBER.startsWith("<")) {
    throw new Error(
      "Twilio FROM number not configured. Set TWILIO_FROM_NUMBER or replace placeholder."
    );
  }

  const client = getTwilioClient();
  // Keep API simple and reusable
  return client.messages.create({
    from: TWILIO_FROM_NUMBER,
    to,
    body,
  });
}

module.exports = { sendSms };
