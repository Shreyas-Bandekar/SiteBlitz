"use client";

import { useRef, useState } from "react";

type SpeechResultEvent = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export default function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const Ctor =
      typeof window !== "undefined"
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : undefined;

    if (!Ctor) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition: SpeechRecognitionLike = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      onTranscript(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();

    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      className={`glass rounded-xl border px-4 py-2 text-sm font-semibold transition hover:scale-[1.02] ${
        isListening ? "border-pink-300 text-pink-100" : "border-cyan-300 text-cyan-100"
      }`}
      aria-label="Use voice command"
    >
      {isListening ? "Listening..." : "Mic: Say 'Audit shopify.com'"}
    </button>
  );
}
