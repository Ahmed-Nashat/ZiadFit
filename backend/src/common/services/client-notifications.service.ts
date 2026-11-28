import { Types } from "mongoose";
import { userRepo } from "../repo/user.repo.js";
import { sendEmail } from "./mail.service.js";
import { questionnaireAcceptedTemplate, questionnaireReviewedTemplate, subscriptionExpiringTemplate } from "../templates/templates.js";

export function formatSubscriptionDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Cairo" }).format(date) + " (Cairo time)";
}

export class ClientNotificationsService {
  async reviewed(clientId: Types.ObjectId) {
    const client = await userRepo.findById({ id: clientId, select: ["email", "firstName"] });
    if (!client) throw new Error("Questionnaire client not found");
    await sendEmail({ recipients: { to: client.email }, subject: "Your questionnaire has been reviewed", html: questionnaireReviewedTemplate({ name: client.firstName }) });
  }

  async accepted(clientId: Types.ObjectId, startAt: Date, endAt: Date) {
    const client = await userRepo.findById({ id: clientId, select: ["email", "firstName"] });
    if (!client) throw new Error("Questionnaire client not found");
    await sendEmail({ recipients: { to: client.email }, subject: "Your questionnaire is accepted", html: questionnaireAcceptedTemplate({ name: client.firstName, startDate: formatSubscriptionDate(startAt), endDate: formatSubscriptionDate(endAt) }) });
  }

  async expiring(clientId: Types.ObjectId, endAt: Date) {
    const client = await userRepo.findById({ id: clientId, select: ["email", "firstName"] });
    if (!client) throw new Error("Subscription client not found");
    await sendEmail({ recipients: { to: client.email }, subject: "Your subscription is ending soon", html: subscriptionExpiringTemplate({ name: client.firstName, endDate: formatSubscriptionDate(endAt) }) });
  }
}

export const clientNotifications = new ClientNotificationsService();
