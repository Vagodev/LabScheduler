import { getSetting } from "./db";

interface TeamsNotificationPayload {
  title: string;
  message: string;
  userId?: number;
}

export async function sendTeamsNotification(payload: TeamsNotificationPayload): Promise<boolean> {
  try {
    const webhookUrl = await getSetting("teams_webhook_url");
    if (!webhookUrl) return false;

    const body = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: "0076D7",
      summary: payload.title,
      sections: [
        {
          activityTitle: payload.title,
          activityText: payload.message,
          markdown: true,
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return response.ok;
  } catch (error) {
    console.error("[Teams] Failed to send notification:", error);
    return false;
  }
}
