// Posting to Slack, the same way Raindrop OS does: a bot token and
// chat.postMessage. Without a token nothing is sent and the caller gets the
// text back, so the message can be checked before the bot is set up.

export async function post({ channel, text, token = process.env.SLACK_BOT_TOKEN }) {
  if (!token) return { sent: false, reason: "SLACK_BOT_TOKEN is not set", text };
  if (!channel) return { sent: false, reason: "no channel", text };

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel, text, unfurl_links: false, unfurl_media: false }),
  });
  const body = await res.json();
  // Slack answers 200 with ok:false for most failures, so check the body.
  if (!body.ok) throw new Error(`Slack refused the post: ${body.error}`);
  return { sent: true, ts: body.ts, text };
}
