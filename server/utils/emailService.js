// Brevo Transactional Email Endpoint (Pure HTTPS API)
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER = {
  name: 'VestaGo Reservations',
  email: process.env.EMAIL_USER || 'aaronfernandes8112004@gmail.com'
};

/**
 * Core helper using native fetch
 */
async function sendViaBrevo(toEmail, toName, subject, htmlContent) {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Brevo Error Response]:', data);
      return null;
    }

    console.log(`[Email Sent] Successfully delivered to: ${toEmail}`, data);
    return data;
  } catch (err) {
    console.error('Failed to send email via Brevo:', err.message);
  }
}

/**
 * 1. Welcome Email
 */
async function sendWelcomeEmail(toEmail, userName) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #222; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #059669; margin-top: 0; font-size: 24px; font-weight: 800;">✓ Welcome to VestaGo!</h2>
      <p style="color: #444; font-size: 15px; margin-top: 10px;">Hi ${userName},</p>
      <p style="color: #555; line-height: 1.6; font-size: 14px;">
        Thank you for creating your VestaGo account! You are now all set to discover and reserve handpicked boutique villas, scenic coastal getaways, and curated culinary bistro tables across India.
      </p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 20px 0;">
        <h4 style="margin: 0 0 6px; color: #166534; font-size: 14px;">What's next?</h4>
        <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 13px; line-height: 1.6;">
          <li>Explore verified luxury villas and staycations</li>
          <li>Reserve tables at premier dining establishments</li>
          <li>Receive instant downloadable vouchers and tax invoices</li>
        </ul>
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 18px; border-top: 1px solid #f0f0f0; padding-top: 12px;">
        © 2026 VestaGo Technologies Inc. All rights reserved.
      </p>
    </div>
  `;

  return sendViaBrevo(toEmail, userName, 'Welcome to VestaGo!', html);
}

/**
 * 2. Booking Confirmation Email
 */
async function sendBookingConfirmation(booking) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #222; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #059669; margin: 0; font-size: 24px; font-weight: 800;">✓ Reservation Confirmed!</h2>
      <p style="color: #555; margin-top: 10px; font-size: 15px;">Hi ${booking.userName}, your verified voucher is ready:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 14px;">Booking ID:</td>
          <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 14px;">Property / Venue:</td>
          <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${booking.title}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 14px;">Dates:</td>
          <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${booking.dates || 'Immediate Confirmation'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 14px;">Location:</td>
          <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${booking.location}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 14px 0; font-size: 16px; font-weight: bold;">Total Paid:</td>
          <td style="padding: 14px 0; font-size: 18px; font-weight: 800; color: #ff385c; text-align: right;">₹${Number(booking.totalAmount).toLocaleString()}</td>
        </tr>
      </table>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-top: 12px;">
        <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">
          Protected by VestaCover. Present this confirmation voucher at check-in.
        </p>
      </div>
    </div>
  `;

  return sendViaBrevo(
    booking.userEmail,
    booking.userName,
    `Reservation Confirmed: ${booking.title} (${booking.id})`,
    html
  );
}

/**
 * 3. Booking Cancellation Email
 */
async function sendBookingCancellation(booking) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #222; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #d90429; margin: 0; font-size: 24px; font-weight: 800;">✕ Cancel Reservation!!</h2>
      <p style="color: #555; margin-top: 10px; font-size: 15px;">Hi ${booking.userName},</p>
      <p style="color: #555; line-height: 1.5; font-size: 14px;">
        Your reservation for <strong>${booking.title}</strong> has been cancelled successfully as requested.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 14px;">Booking Reference:</td>
          <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 14px;">Property / Venue:</td>
          <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${booking.title}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 14px;">Dates:</td>
          <td style="padding: 10px 0; font-weight: bold; text-align: right; font-size: 14px;">${booking.dates || 'Flexible Dates'}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 14px 0; font-size: 16px; font-weight: bold;">Full Refund Amount:</td>
          <td style="padding: 14px 0; font-size: 18px; font-weight: 800; color: #059669; text-align: right;">₹${Number(booking.totalAmount).toLocaleString()}</td>
        </tr>
      </table>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 12px;">
        <p style="margin: 0; font-size: 13px; color: #991b1b; font-weight: 600;">
          A 100% full refund has been triggered through VestaPay to your original payment method. Please allow standard bank processing time.
        </p>
      </div>
    </div>
  `;

  return sendViaBrevo(
    booking.userEmail,
    booking.userName,
    `Reservation Cancelled: ${booking.title} (${booking.id})`,
    html
  );
}

module.exports = {
  sendWelcomeEmail,
  sendBookingConfirmation,
  sendBookingCancellation
};