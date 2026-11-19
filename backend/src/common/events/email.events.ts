import { EventEmitter } from "node:events";
import { eventEnum } from "../enums/events.enum.js";
import { sendEmail } from "../services/mail.service.js";
import {
  signupOtpTemplate,
  forgetPasswordOtpTemplate,
  twoFactorOtpTemplate,
  questionnaireSubmittedTemplate,
  subscriptionRenewedTemplate,
  subscriptionExpiringTemplate,
} from "../templates/templates.js";

type MailOptions = Parameters<typeof sendEmail>[0];
type Recipients = MailOptions["recipients"];
type OtpEvent = { recipients: Recipients; name: string; otp: number | string };
type QuestionnaireEvent = { recipients: Recipients; reviewUrl: string };
type SubscriptionEvent = {
  recipients: Recipients;
  name: string;
  endDate: string;
};

// EventEmitter does not wait for async listeners. Capture failures so they do not
// become unhandled rejections; reliable delivery still requires a persistent queue.
export const eventEmitter = new EventEmitter({ captureRejections: true });
eventEmitter.on("error", () => {
  console.error(
    "An email event failed to send. Check email delivery configuration.",
  );
});

eventEmitter.on(
  eventEnum.signup,
  async ({ recipients, name, otp }: OtpEvent) => {
    await sendEmail({
      recipients,
      subject: "Welcome to Coach Ziad",
      html: signupOtpTemplate({ name, otp }),
    });
  },
);

eventEmitter.on(eventEnum.login, async (payload: MailOptions) => {
  await sendEmail(payload);
});

eventEmitter.on(
  eventEnum.forget,
  async ({ recipients, name, otp }: OtpEvent) => {
    await sendEmail({
      recipients,
      subject: "Reset your password",
      html: forgetPasswordOtpTemplate({ name, otp }),
    });
  },
);

eventEmitter.on(eventEnum.fa, async ({ recipients, name, otp }: OtpEvent) => {
  await sendEmail({
    recipients,
    subject: "2FA verification code",
    html: twoFactorOtpTemplate({ name, otp }),
  });
});

eventEmitter.on(
  eventEnum.questionnaireSubmitted,
  async ({ recipients, reviewUrl }: QuestionnaireEvent) => {
    await sendEmail({
      recipients,
      subject: "New questionnaire to review",
      html: questionnaireSubmittedTemplate({ reviewUrl }),
    });
  },
);

eventEmitter.on(
  eventEnum.subscriptionRenewed,
  async ({ recipients, name, endDate }: SubscriptionEvent) => {
    await sendEmail({
      recipients,
      subject: "Your subscription is renewed",
      html: subscriptionRenewedTemplate({ name, endDate }),
    });
  },
);

eventEmitter.on(
  eventEnum.subscriptionExpiring,
  async ({ recipients, name, endDate }: SubscriptionEvent) => {
    await sendEmail({
      recipients,
      subject: "Your subscription is ending soon",
      html: subscriptionExpiringTemplate({ name, endDate }),
    });
  },
);
