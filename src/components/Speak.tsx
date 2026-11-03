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
      let message = "Error processing text-to-speech";
      try {
        const data = await response.json();
        if (typeof data.error === "string" && data.error.trim()) {
          message = data.error;
        }
      } catch {
        // Response may be empty or non-JSON
      }
      throw new Error(message);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error("Error calling ElevenLabs API:", error);
    throw error instanceof Error
      ? error
      : new Error("Error processing text-to-speech");
  }
};

export default Speak;
