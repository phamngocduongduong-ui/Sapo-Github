import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!to || !to.includes("@")) {
    console.warn(`[Mail] Invalid recipient email address: ${to}`);
    return;
  }
  
  try {
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Sapo EMS'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Mail] Email sent successfully to: ${to}`);
  } catch (error) {
    console.error("[Mail] Error sending email:", error);
  }
}
