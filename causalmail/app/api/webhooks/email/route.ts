import { Webhook } from "svix";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type ResendTag = { name: string; value: string };

type ResendEventData = {
  created_at: string;
  tags?: ResendTag[];
  click?: { link?: string };
};

type ResendEvent = {
  type: string;
  data: ResendEventData;
};

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const body = await request.text();
  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  const wh = new Webhook(secret);
  let event: ResendEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEvent;
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  const customerId = event.data.tags?.find((t) => t.name === "customerId")?.value;
  if (!customerId) return new Response("OK", { status: 200 });

  const ts = new Date(event.data.created_at);

  switch (event.type) {
    // "sent" = accepted by Resend; "delivered" = confirmed by recipient server
    // Update emailSentAt on either — whichever fires first wins, and delivered
    // is a stronger confirmation so it will naturally overwrite with a later ts.
    case "email.sent":
    case "email.delivered":
      await db.customer.updateMany({
        where: { id: customerId },
        data: { emailSentAt: ts },
      });
      break;
    case "email.opened":
      await db.customer.updateMany({
        where: { id: customerId },
        data: { emailOpenedAt: ts },
      });
      break;
    case "email.clicked":
      await db.customer.updateMany({
        where: { id: customerId },
        data: { emailClickedAt: ts, clickedUrl: event.data.click?.link ?? null },
      });
      break;
    // Treat hard failures the same as bounces
    case "email.bounced":
    case "email.failed":
      await db.customer.updateMany({
        where: { id: customerId },
        data: { emailBounced: true },
      });
      break;
  }

  return new Response("OK", { status: 200 });
}
