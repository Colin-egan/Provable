import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend: Resend };

export const resend =
  globalForResend.resend ?? new Resend(process.env.RESEND_API_KEY);

if (process.env.NODE_ENV !== "production") globalForResend.resend = resend;

function injectUtmParams(
  body: string,
  studyId: string,
  customerId: string
): string {
  return body.replace(/(https?:\/\/[^\s"<>]+)/g, (rawUrl) => {
    try {
      const url = new URL(rawUrl);
      url.searchParams.set("utm_source", "causalmail");
      url.searchParams.set("utm_campaign", studyId);
      url.searchParams.set("utm_id", customerId);
      return url.toString();
    } catch {
      return rawUrl;
    }
  });
}

type SendStudyEmailArgs = {
  to: string;
  subject: string;
  body: string;
  studyId: string;
  customerId: string;
};

export async function sendStudyEmail({
  to,
  subject,
  body,
  studyId,
  customerId,
}: SendStudyEmailArgs): Promise<void> {
  const injectedBody = injectUtmParams(body, studyId, customerId);

  const { error } = await resend.emails.send({
    from: "study@causalmail.com",
    to,
    subject,
    text: injectedBody,
    tags: [
      { name: "studyId", value: studyId },
      { name: "customerId", value: customerId },
    ],
  });

  if (error) throw new Error(`Resend error for ${to}: ${error.message}`);
}
