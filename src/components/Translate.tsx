import { readApiJson } from "../lib/readApiJson";

const Translate = async (
  lang: string,
  targetLang: string,
  text: string
): Promise<string> => {
  if (!text) return "";
  if (lang === targetLang) return text;

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, targetLang, text }),
    });

    const data = await readApiJson<{ text?: string }>(response);
    if (typeof data.text === "string" && data.text.length > 0) {
      return data.text;
    }
    return text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
};

export default Translate;
