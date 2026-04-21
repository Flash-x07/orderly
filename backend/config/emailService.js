/**
 * Email Service (Mailer Utility)
 * Uses Gmail SMTP via Nodemailer
 *
 * ADDED:
 *   sendSubscriptionRequestEmail(adminEmail, { userName, userEmail, plan, billingCycle })
 *   sendSubscriptionApprovedEmail(userEmail,  { userName, plan, billingCycle, expiresAt })
 *   sendSubscriptionRejectedEmail(userEmail,  { userName, plan, reason })
 */

const nodemailer = require('nodemailer');

// ─── Transporter ───────────────────────────────────────────────────────────────

const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    throw new Error(
      `[emailService] Missing EMAIL_USER or EMAIL_PASS in .env.\n` +
      `  EMAIL_USER = ${user ? '✓' : '✗ MISSING'}\n` +
      `  EMAIL_PASS = ${pass ? '✓' : '✗ MISSING'}`
    );
  }
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
};

const verifyEmailTransporter = async () => {
  try {
    await createTransporter().verify();
    console.log('✅ [emailService] SMTP connection verified. Email is ready.');
  } catch (err) {
    console.error('❌ [emailService] SMTP verification FAILED:', err.message);
  }
};

// ─── Shared layout ─────────────────────────────────────────────────────────────

const emailWrapper = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a2a5e;padding:28px 40px;text-align:center;">
            <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🍽️ Orderly</span>
          </td>
        </tr>
        <tr><td style="padding:40px;">${bodyHtml}</td></tr>
        <tr>
          <td style="background:#f5f0eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#9c8d82;font-size:12px;">© ${new Date().getFullYear()} Orderly. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const otpBlock = (code) => `
<div style="margin:24px 0;text-align:center;">
  <div style="display:inline-block;background:#f5f0eb;border-radius:12px;padding:20px 40px;">
    <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#1a2a5e;font-family:monospace;">${code}</span>
  </div>
  <p style="margin:12px 0 0;color:#9c8d82;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
</div>`;

const sendMail = async (mailOptions) => {
  const transporter = createTransporter();
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [emailService] Email sent → ${mailOptions.to} (${info.messageId})`);
  } catch (err) {
    console.error(`❌ [emailService] Failed to send to ${mailOptions.to}:`, err.message);
    throw err;
  }
};

const FROM = () => process.env.EMAIL_FROM || `Orderly <${process.env.EMAIL_USER}>`;

// ─── Existing emails ───────────────────────────────────────────────────────────

const sendVerificationEmail = async (toEmail, code, userName) => {
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#1c1917;font-weight:700;">Verify your email address</h2>
    <p style="margin:0 0 8px;color:#6b5e52;font-size:15px;line-height:1.6;">Hi ${userName},</p>
    <p style="margin:0 0 24px;color:#6b5e52;font-size:15px;line-height:1.6;">
      Welcome to Orderly! Enter the 6-digit code below to verify your email address.
    </p>
    ${otpBlock(code)}
    <div style="border-top:1px solid #ece5de;padding-top:20px;margin-top:8px;">
      <p style="margin:0;color:#9c8d82;font-size:13px;">If you didn't create an account, ignore this email.</p>
    </div>`;
  await sendMail({ from: FROM(), to: toEmail, subject: 'Your Orderly verification code', html: emailWrapper('Verify your email - Orderly', body) });
};

const sendPasswordResetEmail = async (toEmail, code, userName) => {
  const body = `
    <h2 style="margin:0 0 12px;font-size:22px;color:#1c1917;font-weight:700;">Reset your password</h2>
    <p style="margin:0 0 8px;color:#6b5e52;font-size:15px;line-height:1.6;">Hi ${userName},</p>
    <p style="margin:0 0 24px;color:#6b5e52;font-size:15px;line-height:1.6;">Use the code below to reset your password.</p>
    ${otpBlock(code)}
    <div style="border-top:1px solid #ece5de;padding-top:20px;margin-top:8px;">
      <p style="margin:0;color:#9c8d82;font-size:13px;">If you didn't request this, ignore this email.</p>
    </div>`;
  await sendMail({ from: FROM(), to: toEmail, subject: 'Your Orderly password reset code', html: emailWrapper('Reset your password - Orderly', body) });
};

// ─── New: Subscription emails ──────────────────────────────────────────────────

/**
 * Notify admin that a new subscription request came in.
 */
const sendSubscriptionRequestEmail = async (adminEmail, { userName, userEmail, plan, billingCycle }) => {
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#1c1917;font-weight:700;">New Subscription Request</h2>
    <p style="margin:0 0 20px;color:#6b5e52;font-size:15px;line-height:1.6;">
      A restaurant owner has requested a paid subscription and is waiting for your approval.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f5f0eb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="color:#9c8d82;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">User</span><br/>
        <span style="color:#1c1917;font-size:15px;font-weight:600;">${userName}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="color:#9c8d82;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Email</span><br/>
        <span style="color:#1c1917;font-size:15px;">${userEmail}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="color:#9c8d82;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Plan</span><br/>
        <span style="color:#FF6B35;font-size:15px;font-weight:700;">${planLabel} · ${billingCycle}</span>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL?.split(',')[0]}/admin/subscriptions"
         style="display:inline-block;background:#FF6B35;color:white;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        Review in Admin Panel →
      </a>
    </div>`;
  await sendMail({ from: FROM(), to: adminEmail, subject: `[Orderly] New ${planLabel} request from ${userName}`, html: emailWrapper('New Subscription Request - Orderly', body) });
};

/**
 * Notify user their subscription was approved.
 */
const sendSubscriptionApprovedEmail = async (userEmail, { userName, plan, billingCycle, expiresAt }) => {
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const expiry    = new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#1c1917;font-weight:700;">🎉 Subscription Approved!</h2>
    <p style="margin:0 0 8px;color:#6b5e52;font-size:15px;line-height:1.6;">Hi ${userName},</p>
    <p style="margin:0 0 24px;color:#6b5e52;font-size:15px;line-height:1.6;">
      Your <strong>${planLabel}</strong> subscription has been approved. You now have full access to all ${planLabel} features.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="color:#9c8d82;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Plan</span><br/>
        <span style="color:#15803d;font-size:15px;font-weight:700;">${planLabel} · ${billingCycle}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="color:#9c8d82;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Access until</span><br/>
        <span style="color:#1c1917;font-size:15px;font-weight:600;">${expiry}</span>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL?.split(',')[0]}/dashboard"
         style="display:inline-block;background:#FF6B35;color:white;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        Go to Dashboard →
      </a>
    </div>`;
  await sendMail({ from: FROM(), to: userEmail, subject: `Your Orderly ${planLabel} subscription is active!`, html: emailWrapper('Subscription Approved - Orderly', body) });
};

/**
 * Notify user their subscription was rejected.
 */
const sendSubscriptionRejectedEmail = async (userEmail, { userName, plan, reason }) => {
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#1c1917;font-weight:700;">Subscription Request Update</h2>
    <p style="margin:0 0 8px;color:#6b5e52;font-size:15px;line-height:1.6;">Hi ${userName},</p>
    <p style="margin:0 0 24px;color:#6b5e52;font-size:15px;line-height:1.6;">
      Your request for the <strong>${planLabel}</strong> plan was not approved at this time.
    </p>
    ${reason ? `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <span style="color:#9c8d82;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Reason</span><br/>
        <span style="color:#991b1b;font-size:15px;">${reason}</span>
      </td></tr>
    </table>` : ''}
    <p style="color:#6b5e52;font-size:15px;line-height:1.6;">
      You can still use a promo code to activate a free trial, or contact support for assistance.
    </p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL?.split(',')[0]}/dashboard/activate"
         style="display:inline-block;background:#FF6B35;color:white;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        Activate a Trial →
      </a>
    </div>`;
  await sendMail({ from: FROM(), to: userEmail, subject: `Update on your Orderly ${planLabel} request`, html: emailWrapper('Subscription Request Update - Orderly', body) });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSubscriptionRequestEmail,
  sendSubscriptionApprovedEmail,
  sendSubscriptionRejectedEmail,
  verifyEmailTransporter,
};
