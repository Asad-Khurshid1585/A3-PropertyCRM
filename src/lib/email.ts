import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

const env = getEnv();

const canSendEmails = Boolean(env.SMTP_HOST && env.EMAIL_FROM);

const transporter = canSendEmails
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    })
  : null;

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  if (!transporter) {
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

export const newLeadEmailTemplate = ({
  leadName,
  source,
  budget,
}: {
  leadName: string;
  source: string;
  budget: number;
}) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f3d3e;">New Lead Created</h2>
      <p>A new lead has been added to the CRM.</p>
      <ul>
        <li><strong>Name:</strong> ${leadName}</li>
        <li><strong>Source:</strong> ${source}</li>
        <li><strong>Budget:</strong> PKR ${budget.toLocaleString()}</li>
      </ul>
    </div>
  `;
};

export const assignedLeadEmailTemplate = ({
  agentName,
  leadName,
}: {
  agentName: string;
  leadName: string;
}) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f3d3e;">Lead Assignment Notification</h2>
      <p>Hello ${agentName},</p>
      <p>You have been assigned a new lead: <strong>${leadName}</strong>.</p>
      <p>Please follow up as soon as possible.</p>
    </div>
  `;
};
