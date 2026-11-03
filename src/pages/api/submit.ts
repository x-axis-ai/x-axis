import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const EMAILS_FILE = path.join(process.cwd(), "emails.txt");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  try {
    if (fs.existsSync(EMAILS_FILE)) {
      const existing = fs
        .readFileSync(EMAILS_FILE, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter(Boolean);

      if (existing.includes(email)) {
        return res.status(200).json({ success: true, duplicate: true });
      }
    }

    fs.appendFileSync(EMAILS_FILE, `${email}\n`, "utf8");
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to write emails.txt:", error);
    return res.status(500).json({
      error:
        "Could not save email. Writing emails.txt works locally; Vercel’s filesystem is not persistent.",
    });
  }
}
