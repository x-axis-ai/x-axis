import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const API_KEY =
  process.env.NEXT_PRIVATE_ELEVENLABS_API_KEY ||
  process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

function elevenLabsMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : "Error processing text-to-speech";
  }

  const data = error.response?.data;
  let parsed: unknown = data;

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
    try {
      parsed = JSON.parse(data.toString("utf8"));
    } catch {
      parsed = null;
    }
  } else if (data instanceof ArrayBuffer) {
    try {
      parsed = JSON.parse(Buffer.from(data).toString("utf8"));
    } catch {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === "object") {
    const detail = (parsed as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (detail && typeof detail === "object") {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    const message = (parsed as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }

  return error.message || "Error processing text-to-speech";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, voiceId } = req.body ?? {};

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  if (typeof voiceId !== "string" || !voiceId.trim()) {
    return res.status(400).json({ error: "voiceId is required" });
  }

  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: "ElevenLabs API key is not configured" });
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(Buffer.from(response.data));
  } catch (error) {
    const message = elevenLabsMessage(error);
    const status = axios.isAxiosError(error)
      ? error.response?.status || 500
      : 500;
    console.error("Error calling ElevenLabs API:", message);
    return res.status(status).json({ error: message });
  }
}
