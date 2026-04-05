/**
 * Email helpers using Resend.
 *
 * Only used for "quote accepted" notifications — the system does NOT
 * send the quote itself (that's manual via Outlook).
 *
 * If RESEND_API_KEY is not set, emails are logged to console instead
 * of sent — useful during development.
 */
import { Resend } from "resend";
import { EMAIL_ADMIN, EMAIL_FROM } from "@/lib/constants";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/** Base URL for the portal (quote details page). Uses NEXTAUTH_URL when set. */
function getPortalBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;  
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

interface AcceptedEmailParams {
  quoteNumber: string;
  quoteId: string;
  customerName: string;
  signedBy: string;
  acceptedAt: Date;
  salesRepName: string;
  salesRepEmail: string;
  total: number;
}

/**
 * Send "quote accepted" notifications to the admin and the sales rep.
 */
export async function sendAcceptedEmails(params: AcceptedEmailParams) {
  const {
    quoteNumber,
    quoteId,
    customerName,
    signedBy,
    acceptedAt,
    salesRepName,
    salesRepEmail,
    total,
  } = params;

  const subject = `Quote ${quoteNumber} Accepted by ${customerName}`;
  const quoteDetailsUrl = `${getPortalBaseUrl()}/quotes/${quoteId}`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111;">Quote Accepted</h2>
      <p>Good news — <strong>${customerName}</strong> has accepted quote <strong>${quoteNumber}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Quote Number</td>
          <td style="padding: 8px 0; font-weight: bold;">${quoteNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Customer</td>
          <td style="padding: 8px 0;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Signed By</td>
          <td style="padding: 8px 0;">${signedBy}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Total</td>
          <td style="padding: 8px 0; font-weight: bold;">$${total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Accepted At</td>
          <td style="padding: 8px 0;">${acceptedAt.toLocaleString("en-CA", { dateStyle: "long", timeStyle: "short" })}</td>
        </tr>
      </table>
      <p style="margin: 20px 0;">
        <a href="${quoteDetailsUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">View quote in portal</a>
      </p>
      <p style="color: #666; font-size: 14px;">— Boss Security Quote System</p>
    </div>
  `;

  const recipients = [EMAIL_ADMIN];
  if (salesRepEmail !== EMAIL_ADMIN) {
    recipients.push(salesRepEmail);
  }

  if (!resend) {
    console.log("--- EMAIL (dev mode, Resend not configured) ---");
    console.log(`To: ${recipients.join(", ")}`);
    console.log(`Subject: ${subject}`);
    console.log(`Quote details link: ${quoteDetailsUrl}`);
    console.log(`Sales Rep: ${salesRepName} (${salesRepEmail})`);
    console.log("--- END EMAIL ---");
    return;
  }

  await Promise.all(
    recipients.map((to) =>
      resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        html: htmlBody,
      })
    )
  );
}

interface ChangeRequestEmailParams {
  quoteNumber: string;
  quoteId: string;
  customerName: string;
  comment: string;
  salesRepName: string;
  salesRepEmail: string;
}

/**
 * Send "customer requested changes" notification to admin and sales rep.
 */
export async function sendChangeRequestEmail(params: ChangeRequestEmailParams) {
  const { quoteNumber, quoteId, customerName, comment, salesRepName, salesRepEmail } =
    params;

  const subject = `${customerName} has feedback on quote ${quoteNumber}`;
  const quoteDetailsUrl = `${getPortalBaseUrl()}/quotes/${quoteId}`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111;">Changes Requested</h2>
      <p><strong>${customerName}</strong> would like to discuss quote <strong>${quoteNumber}</strong> further.</p>
      <div style="background: #f9f9f9; border-left: 4px solid #333; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; white-space: pre-wrap;">${comment}</p>
      </div>
      <p style="margin: 20px 0;">
        <a href="${quoteDetailsUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">View quote & feedback in portal</a>
      </p>
      <p style="color: #666; font-size: 14px;">Please follow up with the customer to discuss their feedback.</p>
      <p style="color: #666; font-size: 14px;">— Boss Security Quote System</p>
    </div>
  `;

  const recipients = [EMAIL_ADMIN];
  if (salesRepEmail !== EMAIL_ADMIN) {
    recipients.push(salesRepEmail);
  }

  if (!resend) {
    console.log("--- EMAIL (dev mode, Resend not configured) ---");
    console.log(`To: ${recipients.join(", ")}`);
    console.log(`Subject: ${subject}`);
    console.log(`Quote details link: ${quoteDetailsUrl}`);
    console.log(`Comment: ${comment}`);
    console.log("--- END EMAIL ---");
    return;
  }

  await Promise.all(
    recipients.map((to) =>
      resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        html: htmlBody,
      })
    )
  );
}
