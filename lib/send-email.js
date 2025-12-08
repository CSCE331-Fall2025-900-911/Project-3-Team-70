import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html, text }) {
  try {
    // Create email transport (using Gmail as an example)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,  // store this in .env
        pass: process.env.EMAIL_PASS,  // also in .env
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
      text,
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, result };

  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: err };
  }
}
