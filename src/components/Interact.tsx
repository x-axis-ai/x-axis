import React, { FC, useEffect, useRef, useState } from "react";
import AudioPlayer from "../components/AudioPlayer";
import { voice_ids } from "../private/voice_ids";
import { PropagateLoader } from "react-spinners";
import languages from "../private/languages";
import Translate from "../components/Translate";
import { getInstructionsByName } from "../../public/instructions";
import { getPersonalityByName } from "../../public/instructions";
import { personalities } from "../../public/instructions";
import { useVoiceEntry } from "../components/VoiceEntry";
import ClientVoiceBeam from "../components/ClientVoiceBeam";

interface BightProps {
  updateColors: () => void;
  useDefaults: () => void;
}

interface FormData {
  placeholder: string;
  query: string;
  language: any;
  waiting: boolean;
  code: any;
  message: string;

  voice: string;
  attitude: string;
  submitted: boolean;
  audioPlayerVisible: boolean;
  messageVisible: boolean;
}

type ThreadMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function BlurRevealText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  let wordIndex = 0;

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) {
          return <React.Fragment key={`s-${index}`}>{part}</React.Fragment>;
        }

        const delay = wordIndex * 0.2;
        wordIndex += 1;

        return (
          <span
            key={`w-${index}`}
            className="blur-reveal-word"
            style={{ animationDelay: `${delay}s` }}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

const Interact: FC<BightProps> = ({ updateColors, useDefaults }) => {
  const [formData, setFormData] = useState<FormData>({
    placeholder: "",
    query: "",
    waiting: false,
    message: "",
    voice: "pNInz6obpgDQGcFmaJgB", // Adam, a premade ElevenLabs voice
    attitude: "Gen-Z",
    submitted: false,
    code: null,
    language: "en",
    audioPlayerVisible: false,
    messageVisible: true,
  });

  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [listening, setListening] = useState(false);
  const previousResponseIdRef = useRef<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const { levelRef, toggleListening, stopListening } = useVoiceEntry({
    language: formData.language,
    listening,
    baselineQuery: formData.query,
    onTranscript: (text) =>
      setFormData((prevData) => ({ ...prevData, query: text })),
    onListeningChange: setListening,
    onError: (message) => alert(message),
  });

  useEffect(() => {
    const translatePlaceholder = async () => {
      const updatedPlaceholder = await Translate(
        "en",
        formData.language,
        "Go off... "
      );

      setFormData((prevFormData) => ({
        ...prevFormData,
        placeholder: updatedPlaceholder,
      }));
    };

    translatePlaceholder();
  }, [formData.language]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, formData.waiting]);

  const applyAssistantMessage = async (rawText: string) => {
    try {
      let messageContent = typeof rawText === "string" ? rawText : "";

      messageContent = messageContent.includes("【")
        ? messageContent.substring(0, messageContent.indexOf("【"))
        : messageContent;

      const between = /```([\s\S]*)```/;
      let tech = between.exec(messageContent)?.[1];
      tech = tech?.substring(tech.indexOf("<"), tech.lastIndexOf(">") + 1);
      messageContent = messageContent.replace(/```[\s\S]*$/, "");

      messageContent = await Translate("en", formData.language, messageContent);

      setThread((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: messageContent,
        },
      ]);

      setFormData((prevData) => ({
        ...prevData,
        code: tech,
        message: messageContent,
        audioPlayerVisible: true,
        messageVisible: true,
        waiting: false,
      }));
    } catch (error) {
      setFormData((prevData) => ({ ...prevData, waiting: false }));
      alert("An error occurred. Please try again. Keys?");
      console.error("API error or no keys provided", error);
    }
  };

  const handleQuery = async (query: string) => {
    try {
      if (!query.trim()) return;

      if (listening) stopListening();

      setThread((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text: query.trim() },
      ]);

      setFormData((prevData) => ({
        ...prevData,
        audioPlayerVisible: false,
        submitted: false,
        waiting: true,
      }));

      const instructions = getInstructionsByName(formData.attitude);
      if (!instructions) {
        throw new Error("Instructions not found for the given attitude");
      }

      const result = await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          instructions,
          previousResponseId: previousResponseIdRef.current,
        }),
      });

      const data = await result.json();
      if (!result.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Response failed"
        );
      }

      if (data.id) {
        previousResponseIdRef.current = data.id;
      }

      if (typeof data.output_text !== "string" || !data.output_text.trim()) {
        throw new Error("Empty response from model");
      }

      await applyAssistantMessage(data.output_text);
    } catch (error) {
      setFormData((prevData) => ({ ...prevData, waiting: false }));
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "An error occurred. Please try again.";
      alert(message);
      console.error("An error occurred:", error);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prevData) => ({ ...prevData, query: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleQuery(formData.query);
    setFormData((prevData) => ({ ...prevData, submitted: true, query: "" }));

  // Dismiss the keyboard on mobile by blurring the input
  const inputElement = document.getElementById("query") as HTMLInputElement;
  if (inputElement) {
    inputElement.blur(); // This will dismiss the keyboard
  }

  };

  // const toggleSelection = (personalityName: string) => {
  //   let str = selectedItems.join(", + ");
  //   alert(str);
  //   setSelectedItems((prev) => {
  //     const newSelection = prev.includes(personalityName)
  //       ? prev.filter((item) => item !== personalityName)
  //       : [...prev, getInstructionsByName(personalityName)].filter(Boolean); // Ensure no undefined values

  //     setFormData((prevData) => ({
  //       ...prevData,
  //       attitude: str,
  //     }));

  //     return newSelection;
  //   });
  // };

  return (
    <div className="flex h-full w-full max-w-3xl flex-col items-center px-[4%] pb-5 pt-16">
      <div className="mb-4 min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-1">
        <div className="flex min-h-full flex-col justify-end gap-4 py-2">
          {thread.map((entry) => (
            <div
              key={entry.id}
              className={`flex w-full ${
                entry.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <p
                className={`max-w-[92%] whitespace-pre-wrap break-words text-[15px] leading-relaxed ${
                  entry.role === "user"
                    ? "rounded-[24px] bg-white/15 px-4 py-2.5 text-right font-medium text-white"
                    : "px-1 font-medium text-white/95"
                }`}
              >
                {entry.role === "assistant" ? (
                  <BlurRevealText text={entry.text} />
                ) : (
                  entry.text
                )}
              </p>
            </div>
          ))}

          {formData.waiting && (
            <div className="flex justify-center px-1 py-3">
              <PropagateLoader color="#ffffff" size={14} speedMultiplier={1.8} />
            </div>
          )}

          <div ref={threadEndRef} />
        </div>
      </div>

      <div className="liquid-glass relative z-10 w-full shrink-0 px-4 py-5">
        <form
          onSubmit={handleSubmit}
          className="flex items-center justify-center"
        >
          <ClientVoiceBeam
            className="min-w-0 flex-1"
            theme="dark"
            sensitivity={1.9}
            threshold={0.015}
            attack={0.05}
            release={0.28}
            reach={1.35}
            active={listening || formData.waiting || formData.audioPlayerVisible}
            level={() => {
              if (listening) return levelRef.current;
              if (formData.waiting) return 0.35;
              if (formData.audioPlayerVisible) return 0.45;
              return 0;
            }}
          >
            <div className="liquid-glass-bar overflow-hidden transition-all duration-300 bounce items-center justify-center z-10 flex w-full p-1.5 rounded-[40px]">
              <select
                className="   text-white mr-2 pl-2 text-xl focus:outline-none cursor-pointer focus:ring-0 hover:scale-90 transition-transform duration-500 ease-in-out custom-select"
                value={formData.language}
                title="Choose a language"
                onChange={(e) =>
                  setFormData((prevData) => ({
                    ...prevData,
                    language: e.target.value,
                  }))
                }
                style={{
                  borderRadius: "20px 10px 10px 20px",
                  width: "38px",
                  height: "32px",
                  WebkitAppearance: "none",
                }}
              >
                {Object.entries(languages).map(([name, flag]) => (
                  <option key={flag} value={name}>
                    {flag}
                  </option>
                ))}
              </select>
              <select
                className="   text-white mr-2 pl-2 text-xl focus:outline-none cursor-pointer focus:ring-0 scale-x-[-1] hover:scale-x-[-0.9] hover:scale-y-90 transition-transform duration-500 ease-in-out custom-select"
                value={formData.voice}
                title="Choose a voice"
                onChange={(e) =>
                  setFormData((prevData) => ({
                    ...prevData,
                    voice: e.target.value,
                  }))
                }
                style={{
                  borderRadius: "20px 10px 10px 20px",
                  width: "38px",
                  height: "32px",
                  WebkitAppearance: "none",
                }}
              >
                <optgroup label="He/Him">
                  {Object.entries(voice_ids.he).map(([name, id]) => (
                    <option key={name} value={id}>
                      {name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="She/Her">
                  {Object.entries(voice_ids.her).map(([name, id]) => (
                    <option key={name} value={id}>
                      {name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="They/Them">
                  {Object.entries(voice_ids.they).map(([name, id]) => (
                    <option key={name} value={id}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <input
                style={{ flex: 1 }}
                onChange={handleQueryChange}
                value={formData.query}
                id="query"
                placeholder={listening ? "Listening..." : formData.placeholder}
                className="caret-white text-white pl-2 focus:outline-none focus:ring-0 bg-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={toggleListening}
                title={listening ? "Stop listening" : "Speak"}
                className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full hover:scale-90 transition-transform duration-500 ease-in-out ${
                  listening ? "bg-red-400" : "bg-white"
                }`}
                style={{ width: "32px", height: "32px" }}
              >
                <span className="pointer-events-none text-base leading-none" aria-hidden>
                  {listening ? "◼" : "🎙️"}
                </span>
              </button>
              <div
                className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white hover:scale-90 transition-transform duration-500 ease-in-out ml-1"
                style={{ width: "32px", height: "32px" }}
              >
                <span className="pointer-events-none text-xl leading-none" aria-hidden>
                  🎭
                </span>
                <select
                  className="absolute inset-0 cursor-pointer opacity-0 focus:outline-none focus:ring-0"
                  value={formData.attitude}
                  title="Customize attitude"
                  onChange={(e) => {
                    const selectedPersonality = getPersonalityByName(e.target.value);
                    setFormData((prevData) => ({
                      ...prevData,
                      attitude: selectedPersonality ? selectedPersonality.name : "",
                    }));
                  }}
                  style={{ WebkitAppearance: "none" }}
                >
                  {personalities.map((personality) => (
                    <option key={personality.name} value={personality.name}>
                      {personality.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ClientVoiceBeam>

          <button
            type="submit"
            className="bg-white text-black ml-1.5  text-xl font-bold focus:outline-none cursor-pointer focus:ring-0 hover:scale-90 transition-transform duration-500 ease-in-out custom-select"
            style={{
              borderRadius: "999px",
              width: "40px",
              height: "40px",
              WebkitAppearance: "none",
            }}
          >
            ✦
          </button>
        </form>
      </div>

      {formData.audioPlayerVisible && (
        <AudioPlayer
          key={formData.message}
          inputText={formData.message}
          voiceChoice={formData.voice}
          onPlay={updateColors}
          onEnded={useDefaults}
        />
      )}
    </div>
  );
};

export default Interact;
