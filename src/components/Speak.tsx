import { readApiJson } from "../lib/readApiJson";

const Speak = async (inputText: string, voiceChoice: string) => {
  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: inputText,
        voiceId: voiceChoice,
      }),
    });

    if (!response.ok) {
      const data = await readApiJson<{ error?: string }>(response);
      throw new Error(
        typeof data.error === "string" && data.error.trim()
          ? data.error
          : "Error processing text-to-speech"
      );
    }

    const audioBlob = await response.blob();
    if (!audioBlob.size) {
      throw new Error("Empty audio response");
    }
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error("Error calling ElevenLabs API:", error);
    throw error instanceof Error
      ? error
      : new Error("Error processing text-to-speech");
  }
};

export default Speak;
