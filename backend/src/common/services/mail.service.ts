import { Attachment, createTransport, Transporter } from "nodemailer";
import * as configService from "../../config/config.service.js";

const transporter: Transporter = createTransport({
  service: "gmail",
  auth: {
    user: configService.app_email,
    pass: configService.app_password,
  },
});

export const sendEmail = async ({
  recipients,
  subject,
  attachments,
  html,
  text,
}: {
  recipients: {
    to: string;
    cc?: string;
    bc?: string;
  };
  subject: string;
  html?: string;
  text?: string;
  attachments?: Attachment[];
}) => {
  await transporter.sendMail({
    from: `ZiadFit <${configService.app_email}>`,
    ...recipients,
    subject,
    text,
    html,
    attachments,
  });
};
