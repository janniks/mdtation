"use client";
import { useEffect, useState } from "react";

const ZEN = ["🧘", "🧘‍♀️", "🧘‍♂️"];

/** Header tile: the lotus pose, a random variant (neutral, woman, man) per load, masked to a warm grey and faded in on the client. */
export function Zen() {
  const [e, set] = useState("");
  useEffect(() => set(ZEN[Math.floor(Math.random() * ZEN.length)]), []);
  return (
    <span
      className={`inline-block transition-all duration-500 ease-out [filter:grayscale(1)_contrast(0)_brightness(0.92)_sepia(0.25)] ${e ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
    >
      {e || "🧘"}
    </span>
  );
}
