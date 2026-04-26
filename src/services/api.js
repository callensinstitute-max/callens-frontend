const API_URL = "http://127.0.0.1:8000/chat";

export async function streamMessage(message, model, onToken) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      model,
      user_id: "arpit",
    }),
  });

  if (!res.body) {
    throw new Error("No response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    const chunk = decoder.decode(value);

    // 🔥 IMPORTANT: ensure it's a function
    if (typeof onToken === "function") {
      onToken(chunk);
    }
  }
}