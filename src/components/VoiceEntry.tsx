import React, { useEffect, useRef } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const SPEECH_LANG: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  de: "de-DE",
  hi: "hi-IN",
  fr: "fr-FR",
  ko: "ko-KR",
  it: "it-IT",
  es: "es-ES",
  id: "id-ID",
  nl: "nl-NL",
  tr: "tr-TR",
  pl: "pl-PL",
  sv: "sv-SE",
  bg: "bg-BG",
  ro: "ro-RO",
  ar: "ar-SA",
  cs: "cs-CZ",
  el: "el-GR",
  fi: "fi-FI",
  ms: "ms-MY",
  sk: "sk-SK",
  da: "da-DK",
  uk: "uk-UA",
  ru: "ru-RU",
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface VoiceEntryProps {
  language: string;
  listening: boolean;
  baselineQuery: string;
  onTranscript: (text: string) => void;
  onListeningChange: (listening: boolean) => void;
  onError: (message: string) => void;
}

export function useVoiceEntry({
  language,
  listening,
  baselineQuery,
  onTranscript,
  onListeningChange,
  onError,
}: VoiceEntryProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baselineRef = useRef(baselineQuery);
  const listeningRef = useRef(listening);
  const levelRef = useRef(0);
  const onTranscriptRef = useRef(onTranscript);
  const onListeningChangeRef = useRef(onListeningChange);
  const onErrorRef = useRef(onError);

  const meterStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterFrameRef = useRef(0);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onListeningChangeRef.current = onListeningChange;
    onErrorRef.current = onError;
  }, [onTranscript, onListeningChange, onError]);

  const stopMeter = () => {
    if (meterFrameRef.current) {
      cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = 0;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    if (meterStreamRef.current) {
      meterStreamRef.current.getTracks().forEach((track) => track.stop());
      meterStreamRef.current = null;
    }
    levelRef.current = 0;
  };

  const startMeter = async () => {
    stopMeter();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Keep browser voice processing on so this can share the mic
          // with SpeechRecognition instead of kicking it off.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      meterStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      const context = new AudioCtx();
      await context.resume();
      audioContextRef.current = context;

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);
      analyserRef.current = analyser;

      const samples = new Uint8Array(analyser.fftSize);
      let display = 0;

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(samples);

        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          const centered = (samples[i] - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        // Hot gain + soft curve so quiet speech still moves the ring hard.
        const shaped = Math.pow(Math.min(1, rms * 6.5), 0.55);

        // Fast attack, slower release.
        display =
          shaped > display
            ? display * 0.25 + shaped * 0.75
            : display * 0.78 + shaped * 0.22;

        levelRef.current = Math.min(1, display);
        meterFrameRef.current = requestAnimationFrame(tick);
      };

      meterFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // Ring can keep a light idle pulse if metering fails.
      let frame = 0;
      const tick = () => {
        if (!listeningRef.current) return;
        levelRef.current = 0.18 + Math.sin(Date.now() / 180) * 0.08;
        frame = requestAnimationFrame(tick);
        meterFrameRef.current = frame;
      };
      meterFrameRef.current = requestAnimationFrame(tick);
    }
  };

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
      stopMeter();
    };
  }, []);

  const stopListening = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    listeningRef.current = false;
    try {
      recognition?.stop();
    } catch {
      // already stopped
    }
    stopMeter();
    onListeningChangeRef.current(false);
  };

  const startListening = async () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      // Desktop Safari has no SpeechRecognition — don't alert-spam.
      onErrorRef.current(
        "Voice typing isn’t available in this browser. Try Chrome or Edge."
      );
      return;
    }

    baselineRef.current = baselineQuery;
    listeningRef.current = true;
    onListeningChangeRef.current(true);

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG[language] || "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const prefix = baselineRef.current.trim();
      const next = [prefix, transcript.trim()].filter(Boolean).join(" ");
      onTranscriptRef.current(next);
    };

    recognition.onerror = (event) => {
      const error = event.error || "";
      // Safari/WebKit often fires these without a real failure.
      if (
        error === "aborted" ||
        error === "no-speech" ||
        error === "network" ||
        error === "not-allowed" ||
        error === "service-not-allowed" ||
        error === "language-not-supported"
      ) {
        if (
          error === "not-allowed" ||
          error === "service-not-allowed" ||
          error === "language-not-supported"
        ) {
          stopListening();
        }
        return;
      }
      onErrorRef.current(error || "Voice typing failed.");
      stopListening();
    };

    recognition.onend = () => {
      if (!listeningRef.current || recognitionRef.current !== recognition) {
        return;
      }
      try {
        recognition.start();
      } catch {
        stopListening();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      // Meter after recognition so Chrome is less likely to drop STT.
      void startMeter();
    } catch (error) {
      stopListening();
      onErrorRef.current(
        error instanceof Error ? error.message : "Could not start voice typing."
      );
    }
  };

  const toggleListening = () => {
    if (listeningRef.current) {
      stopListening();
      return;
    }
    void startListening();
  };

  return {
    levelRef,
    toggleListening,
    stopListening,
  };
}

