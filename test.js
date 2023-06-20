const nodemailer = require("nodemailer");

user = "pgseeker.hq@gmail.com";
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass: "ipoyfaczklshsnyt",
    },
  });
  const mailOptions = {
    from: `Udit Jain <${process.env.GMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

sendEmail({
  email: "uditj87085@gmail.com",
  subject: "Email check 1 2 3...",
  message: "Hello world",
});
