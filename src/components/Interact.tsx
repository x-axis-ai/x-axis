import React, { FC, useEffect, useRef, useState } from "react";
import AudioPlayer from "../components/AudioPlayer";
import { voice_ids } from "../private/voice_ids";
import { PropagateLoader } from "react-spinners";
import languages from "../private/languages";
import Translate from "../components/Translate";
import { getInstructionsByName } from "../../public/instructions";
import { getPersonalityByName } from "../../public/instructions";

import Spline from "@splinetool/react-spline";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

import { personalities } from "../../public/instructions";

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

const Interact: FC<BightProps> = ({ updateColors, useDefaults }) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    placeholder: "",
    query: "",
    waiting: false,
    message: "",
    voice: "T0pkYhIZ7UMOc26gqqeX", // mrk voice from he category
    attitude: "Gen-Z",
    submitted: false,
    code: null,
    language: "🇺🇸",
    audioPlayerVisible: false,
    messageVisible: true,
  });

  const previousResponseIdRef = useRef<string | null>(null);

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

  const applyAssistantMessage = async (rawText: string) => {
    try {
      let messageContent = rawText.includes("【")
        ? rawText.substring(0, rawText.indexOf("【"))
        : rawText;

      const between = /```([\s\S]*)```/;
      let tech = between.exec(messageContent)?.[1];
      tech = tech?.substring(tech.indexOf("<"), tech.lastIndexOf(">") + 1);
      messageContent = messageContent.replace(/```[\s\S]*$/, "");

      messageContent = await Translate("en", formData.language, messageContent);

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
        throw new Error(data.error || "Response failed");
      }

      if (data.id) {
        previousResponseIdRef.current = data.id;
      }

      await applyAssistantMessage(data.output_text);
    } catch (error) {
      setFormData((prevData) => ({ ...prevData, waiting: false }));
      alert(error);
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
    <div className="w-[100%] ">
      <form
        onSubmit={handleSubmit}
        className={`flex items-center justify-center  ${
          formData.waiting ? "fade-out-main" : "fade-in-main"
        } `}
      >
        <div className="bg-white/0 outline outline-white overflow-hidden  transition-all duration-300 bounce items-center justify-center z-10 flex w-5/5 bg-black/100 p-1.5 rounded-[30px] shadow-xl shadow-black/30  ">
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
            className="   text-white mr-2 pl-2 text-xl focus:outline-none cursor-pointer focus:ring-0 hover:scale-90 transition-transform duration-500 ease-in-out custom-select"
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
            placeholder={formData.placeholder}
            className="caret-white text-white pl-2 focus:outline-none focus:ring-0 bg-transparent"
            autoFocus
          />
        </div>

        <button
          type="submit" // Ensure this is a submit button
          className="bg-white text-black ml-1.5  text-xl font-bold focus:outline-none cursor-pointer focus:ring-0 hover:scale-90 transition-transform duration-500 ease-in-out custom-select"
          style={{
            borderRadius: "20px",
            width: "40px", // Adjust width as needed
            height: "40px",
            WebkitAppearance: "none",
          }}
        >
          ✦
        </button>
      </form>
      {/* Moved dropdowns outside the form */}
      <div className="opacity-0 w-full flex items-center justify-center mt-4">
        <select
          className="  pl-3 mr-1 focus:outline-none cursor-pointer focus:ring-0 hover:scale-90 font-bold text-sm transition-transform duration-500 ease-out"
          value={formData.attitude}
          title="Customize attitude"
          onChange={(e) => {
            const selectedPersonality = getPersonalityByName(e.target.value);
            setFormData((prevData) => ({
              ...prevData,
              attitude: selectedPersonality ? selectedPersonality.name : "",
            }));
          }}
          style={{
            borderRadius: "20px 11px 11px 20px",
            width: "77px",
            height: "39px",
            WebkitAppearance: "none",
          }}
        >
          <optgroup label="Attitude">
            {personalities.map((personality) => (
              <option key={personality.name} value={personality.name}>
                {personality.name}
              </option>
            ))}
          </optgroup>
        </select>

        <select
          className="  pl-2 focus:outline-none cursor-pointer bg-gradient-to-b from-white/50 to-white focus:ring-0 hover:scale-90 font-semibold text-md transition-transform duration-500 ease-out"
          value={formData.voice}
          title="Customize voice"
          onChange={(e) =>
            setFormData((prevData) => ({
              ...prevData,
              voice: e.target.value,
            }))
          }
          style={{
            borderRadius: "12px",
            width: "70px",
            height: "39px",
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
      </div>
      <div className="scale-150 overflow-hidden">
        {/* <Spline scene="https://prod.spline.design/efovozZ1Mdzz734Z/scene.splinecode" /> */}
      </div>
      {formData.waiting ? (
        <div
          className={`flex absolute left-0 right-0 justify-center items-center ${
            formData.waiting ? "fade-in" : "fade-out"
          }`}
        >
          <PropagateLoader color="#ffffff" size={18} speedMultiplier={1.8} />
        </div>
      ) : (
        <div className="mt-0">
          {formData.messageVisible && (
            <div>
              <p
                className={`flex justify-center items-center flex-col p-4 font-medium text-md text-white ${
                  !formData.waiting ? "fade-in-main" : "fade-out-main"
                }`}
              >
                {/* {formData.message} */}
              </p>
            </div>
          )}
          <div
            className={`flex flex-col justify-center pt-8 ${
              formData.waiting ? "fade-in" : "fade-out"
            }`}
          >
            {/* {formData.code && <CodePreview code={formData.code} />} */}
          </div>
        </div>
      )}
      {formData.audioPlayerVisible && (
        <AudioPlayer
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
