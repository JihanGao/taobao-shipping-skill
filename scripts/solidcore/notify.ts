import { requirePushoverConfig } from "./config";

export async function sendPushoverNotification(params: {
  title: string;
  message: string;
  priority?: number;
  sound?: string;
  url?: string;
  urlTitle?: string;
}): Promise<void> {
  const { appToken, userKey } = requirePushoverConfig();

  const body = new URLSearchParams({
    token: appToken,
    user: userKey,
    title: params.title,
    message: params.message,
    priority: String(params.priority ?? 0),
    sound: params.sound ?? "persistent",
  });

  if (params.url) {
    body.set("url", params.url);
  }

  if (params.urlTitle) {
    body.set("url_title", params.urlTitle);
  }

  if ((params.priority ?? 0) === 2) {
    body.set("retry", "60");
    body.set("expire", "1800");
  }

  const response = await fetch("https://api.pushover.net/1/messages.json", {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pushover request failed (${response.status}): ${text}`);
  }
}
