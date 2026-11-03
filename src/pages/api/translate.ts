import type { NextApiRequest, NextApiResponse } from "next";

type TranslateBody = {
  lang?: string;
  targetLang?: string;
  text?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lang, targetLang, text } = (req.body || {}) as TranslateBody;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text" });
  }

  const source = typeof lang === "string" && lang ? lang : "en";
  const target =
    typeof targetLang === "string" && targetLang ? targetLang : "en";

  if (source === target) {
    return res.status(200).json({ text });
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      source
    )}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) {
      // Unofficial gtx endpoint is often rate-limited; keep original copy.
      console.warn("Translate upstream status:", response.status);
      return res.status(200).json({ text });
    }

    const data = (await response.json()) as unknown;
    const translated =
      Array.isArray(data) &&
      Array.isArray(data[0]) &&
      Array.isArray(data[0][0]) &&
      typeof data[0][0][0] === "string"
        ? data[0][0][0]
        : text;

    return res.status(200).json({ text: translated });
  } catch (error) {
    console.error("Translate API error:", error);
    return res.status(200).json({ text });
  }
}
