"use client";
import { useEffect, useRef } from "react";
import { code } from "./code";

/** Looping feature clip: `/media/<name>.mp4` with a poster, in a hairline frame. Dark until the poster lands. */
export function Clip({
  name,
  caption,
  className = "",
  frame = "rounded-md",
  wide = false,
  still = false,
}: {
  name: string;
  caption?: string;
  className?: string;
  /** Corner treatment of the frame. */
  frame?: string;
  /** 2:1 crop from the top instead of the full terminal, for rows where the clip is secondary. */
  wide?: boolean;
  /** Poster only, no video: for steps the reader can imagine. */
  still?: boolean;
}) {
  const box = wide ? "aspect-[2/1] object-cover object-top" : "aspect-[1580/1120] object-cover";
  const ref = useRef<HTMLVideoElement>(null);
  // Mobile browsers ignore autoplay until the element is on screen and sometimes even then: nudge it.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <figure className={`min-w-0 ${className}`}>
      <div className={`overflow-hidden border bg-[#1b1d1b] ${frame}`}>
        {still ? (
          <img
            src={`/media/${name}.png`}
            alt={caption?.replaceAll("`", "") ?? ""}
            className={`block w-full ${box}`}
          />
        ) : (
          <video
            ref={ref}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            poster={`/media/${name}.png`}
            aria-label={caption?.replaceAll("`", "")}
            className={`block w-full ${box}`}
          >
            <source src={`/media/${name}.mp4`} type="video/mp4" />
          </video>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 font-mono text-xs text-muted-foreground">
          {code(caption)}
        </figcaption>
      )}
    </figure>
  );
}
