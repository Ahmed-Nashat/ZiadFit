type OtpTemplateData = { name: string; otp: number | string };
type SubscriptionEmailData = { name: string; endDate: string };

export const questionnaireReviewedTemplate = ({ name }: { name: string }): string =>
  emailLayout("Questionnaire reviewed", `<tr><td style="background:#172131;padding:32px 28px;"><p style="color:#6ebcff;font-size:11px;letter-spacing:2px;">YOUR QUESTIONNAIRE</p><h1 style="color:#fff;font-size:30px;margin:0;">Your answers have been reviewed.</h1></td></tr><tr><td style="padding:30px 28px;">${paragraph(`Hi ${name}, Coach Ziad has reviewed your answers and will contact you about the next step.`)}${paragraph("We will let you know once your questionnaire is accepted.")}</td></tr>`);

export const questionnaireAcceptedTemplate = ({ name, startDate, endDate }: { name: string; startDate: string; endDate: string }): string =>
  emailLayout("Subscription active", `<tr><td style="background:#e8ff2f;padding:32px 28px;color:#080b12;"><p style="font-size:11px;letter-spacing:2px;font-weight:bold;">QUESTIONNAIRE ACCEPTED</p><h1 style="font-size:34px;margin:0;">LET'S GET STARTED.</h1></td></tr><tr><td style="padding:30px 28px;">${paragraph(`Hi ${name}, your questionnaire has been accepted and your subscription is active.`)}<table role="presentation" width="100%" cellpadding="10" style="background:#172131;color:#fff;"><tr><td>STARTS</td><td>${escapeHtml(startDate)}</td></tr><tr><td>ENDS</td><td>${escapeHtml(endDate)}</td></tr></table></td></tr>`);

const escapeHtml = (value: string | number): string =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );

const paragraph = (text: string): string =>
  `<p style="margin:0 0 20px;color:#bac6d6;font-size:15px;line-height:1.7;">${escapeHtml(text)}</p>`;

function emailLayout(title: string, content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${escapeHtml(title)} | Coach Ziad</title></head>
<body style="margin:0;background:#080b12;font-family:Arial,Helvetica,sans-serif;color:#f5f6fb;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080b12;"><tr><td align="center" style="padding:28px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0c111a;border:1px solid #30394a;"><tr><td style="padding:24px 28px;border-bottom:1px solid #252d3b;"><span style="display:block;color:#9aa6b8;font-size:10px;font-weight:bold;letter-spacing:3px;">COACH</span><span style="font-size:25px;font-weight:900;color:#fff;letter-spacing:1px;">ZI<span style="color:#e8ff2f;">AD</span></span></td></tr>${content}<tr><td style="padding:22px 28px;border-top:1px solid #252d3b;color:#8996a8;font-size:11px;letter-spacing:1px;line-height:1.6;">COACH ZIAD &nbsp; <span style="color:#e8ff2f;">&#8226;</span> &nbsp; TRAIN HARD. TRACK EVERYTHING.</td></tr></table></td></tr></table></body></html>`;
}

const safety = `<p style="margin:24px 0 0;color:#8996a8;font-size:12px;line-height:1.6;">If you didn?t request this code, ignore this email. Never share your code with anyone.</p>`;

export const signupOtpTemplate = ({ name, otp }: OtpTemplateData): string =>
  emailLayout(
    "Welcome to the team",
    `<tr><td style="background:#17263a;padding:38px 28px 30px;"><p style="margin:0 0 12px;color:#e8ff2f;font-size:11px;font-weight:bold;letter-spacing:2px;">YOUR JOURNEY STARTS HERE</p><h1 style="margin:0;color:#fff;font-size:38px;line-height:1.1;">WELCOME<br>TO THE TEAM.</h1></td></tr><tr><td style="padding:30px 28px;">${paragraph(`Hi ${name}, verify your email to finish setting up your account.`)}<p style="margin:0 0 8px;color:#6ebcff;font-size:11px;font-weight:bold;letter-spacing:2px;">YOUR VERIFICATION CODE</p><p dir="ltr" style="margin:0;padding:18px;background:#e8ff2f;color:#080b12;font-size:32px;font-weight:bold;letter-spacing:5px;">${escapeHtml(otp)}</p>${safety}</td></tr>`,
  );

export const forgetPasswordOtpTemplate = ({
  name,
  otp,
}: OtpTemplateData): string =>
  emailLayout(
    "Reset your password",
    `<tr><td style="padding:36px 28px;"><p style="margin:0 0 14px;color:#6ebcff;font-size:11px;font-weight:bold;letter-spacing:2px;">ACCOUNT RECOVERY &nbsp; / &nbsp; 01</p><h1 style="margin:0 0 22px;color:#fff;font-size:30px;line-height:1.2;">Reset your<br>password.</h1>${paragraph(`Hi ${name}, use this code to continue resetting your password.`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-left:4px solid #6ebcff;background:#151e2c;padding:18px 20px;"><span style="display:block;color:#9aa6b8;font-size:11px;letter-spacing:1px;">RESET CODE</span><strong dir="ltr" style="display:block;color:#fff;font-size:30px;letter-spacing:5px;padding-top:8px;">${escapeHtml(otp)}</strong></td></tr></table>${safety}</td></tr>`,
  );

export const twoFactorOtpTemplate = ({ name, otp }: OtpTemplateData): string =>
  emailLayout(
    "Security verification",
    `<tr><td align="center" style="padding:38px 28px;"><p style="margin:0 0 18px;color:#6ebcff;font-size:11px;font-weight:bold;letter-spacing:2px;">ACCOUNT SECURITY</p><p style="margin:0 auto 18px;width:48px;height:48px;line-height:48px;border:1px solid #6ebcff;border-radius:50%;color:#6ebcff;font-size:22px;">&#10003;</p><h1 style="margin:0 0 18px;color:#fff;font-size:28px;">Verify it?s you.</h1>${paragraph(`Hi ${name}, enter this code to complete your verification.`)}<p dir="ltr" style="margin:0;padding:20px 8px;border-top:1px solid #35445b;border-bottom:1px solid #35445b;color:#e8ff2f;font-size:32px;font-weight:bold;letter-spacing:7px;">${escapeHtml(otp)}</p>${safety}</td></tr>`,
  );

/** The review page must require coach authentication and authorization. */
export const questionnaireSubmittedTemplate = ({
  reviewUrl,
}: {
  reviewUrl: string;
}): string => {
  const url = new URL(reviewUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("Notification links must use HTTP or HTTPS.");
  return emailLayout(
    "New questionnaire",
    `<tr><td style="background:#172131;padding:28px;"><p style="margin:0 0 10px;color:#6ebcff;font-size:11px;font-weight:bold;letter-spacing:2px;">COACH DASHBOARD &nbsp; / &nbsp; ACTION REQUIRED</p><h1 style="margin:0;color:#fff;font-size:28px;line-height:1.2;">A new questionnaire<br>is ready for review.</h1></td></tr><tr><td style="padding:30px 28px;">${paragraph("Hi Coach, a client has submitted their questionnaire. Sign in to the dashboard to review it.")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#101724;"><tr><td style="padding:16px;border-left:3px solid #e8ff2f;color:#fff;font-size:13px;"><strong style="color:#e8ff2f;">NEW SUBMISSION</strong><br><span style="color:#9aa6b8;">Awaiting your review</span></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#e8ff2f;"><a href="${escapeHtml(url.href)}" style="display:inline-block;padding:15px 20px;color:#080b12;font-weight:bold;font-size:14px;text-decoration:none;">Review questionnaire &rarr;</a></td></tr></table></td></tr>`,
  );
};

export const subscriptionRenewedTemplate = ({
  name,
  endDate,
}: SubscriptionEmailData): string =>
  emailLayout(
    "Subscription renewed",
    `<tr><td align="center" style="background:#e8ff2f;padding:30px 28px;color:#080b12;"><p style="margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:2px;">RENEWAL CONFIRMED</p><h1 style="margin:0;font-size:34px;line-height:1.15;">KEEP GOING.</h1></td></tr><tr><td style="padding:32px 28px;">${paragraph(`Hi ${name}, your subscription is renewed. Your coaching journey continues.`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #35445b;border-bottom:1px solid #35445b;"><tr><td style="padding:16px 0;color:#9aa6b8;font-size:13px;">SUBSCRIPTION ENDS</td><td align="right" style="padding:16px 0;color:#fff;font-size:15px;font-weight:bold;">${escapeHtml(endDate)}</td></tr></table><p style="margin:24px 0 0;color:#6ebcff;font-size:12px;font-weight:bold;letter-spacing:1px;">TRAIN HARD. TRACK EVERYTHING.</p></td></tr>`,
  );

export const subscriptionExpiringTemplate = ({
  name,
  endDate,
}: SubscriptionEmailData): string =>
  emailLayout(
    "Subscription ending soon",
    `<tr><td style="padding:34px 28px;"><p style="margin:0 0 16px;color:#e8ff2f;font-size:11px;font-weight:bold;letter-spacing:2px;">SUBSCRIPTION REMINDER</p><h1 style="margin:0 0 22px;color:#fff;font-size:31px;line-height:1.2;">Let?s keep your<br><span style="color:#6ebcff;">momentum.</span></h1>${paragraph(`Hi ${name}, your subscription is approaching its end.`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#172131;"><tr><td style="padding:20px;"><span style="display:block;color:#9aa6b8;font-size:11px;font-weight:bold;letter-spacing:1px;">YOUR SUBSCRIPTION ENDS</span><strong style="display:block;padding-top:8px;color:#fff;font-size:22px;">${escapeHtml(endDate)}</strong></td></tr></table><p style="margin:24px 0 0;color:#bac6d6;font-size:15px;line-height:1.7;">Contact Coach Ziad on WhatsApp if you?d like to renew.</p></td></tr>`,
  );
