const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function main() {
  console.log("Using SMTP settings:");
  console.log("Host:", process.env.SMTP_HOST);
  console.log("Port:", process.env.SMTP_PORT);
  console.log("User:", process.env.SMTP_USER);
  console.log("Pass is set:", !!process.env.SMTP_PASS);

  try {
    console.log("Attempting to send test email to phamngocduong.duong@gmail.com...");
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Sapo EMS'}" <${process.env.SMTP_USER}>`,
      to: "phamngocduong.duong@gmail.com",
      subject: "[Sapo EMS] Test Email Configuration",
      html: "<p>Đây là email kiểm tra cấu hình hệ thống gửi mail tự động.</p>",
    });
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error occurred while sending mail:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
  }
}

main();
