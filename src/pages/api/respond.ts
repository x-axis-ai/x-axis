import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PRIVATE_OPENAI_API_KEY,
});

const model = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o-mini";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { query, instructions, previousResponseId } = req.body ?? {};

  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  if (typeof instructions !== "string" || !instructions.trim()) {
    return res.status(400).json({ error: "instructions are required" });
  }

  if (!process.env.NEXT_PRIVATE_OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI API key is not configured" });
  }

  try {
    const response = await openai.responses.create({
      model,
      instructions,
      input: query,
      store: true,
      previous_response_id:
        typeof previousResponseId === "string" && previousResponseId
          ? previousResponseId
          : undefined,
    });

    if (response.status === "failed") {
      return res.status(502).json({ error: "Response failed" });
    }

    const outputText =
      typeof response.output_text === "string" ? response.output_text : "";

    if (!outputText.trim()) {
      return res.status(502).json({ error: "Empty response from model" });
    }

    return res.status(200).json({
      id: response.id,
      output_text: outputText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
