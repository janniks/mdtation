"use client";

// One readable stage instead of rows of thumbnails: `Stage` plays the loop as three chapters, `Tour` lets a short feature list drive the same kind of stage.

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Picker, usePick } from "../../pick";

export const stages = ["caption", "tabs", "rail", "strip", "panel"] as const;
export const tours = ["side", "chips", "legend"] as const;

/** Shared look, all optional so the homepage can drop the components in bare. */
export type Look = {
  /** Corner radius of the stage in px. */
  radius?: number;
  /** Hero-style soft shadow, or a flat mat around the clip. */
  frame?: "shadow" | "flat";
  /** Playback rate. */
  speed?: number;
  /** Seconds to rest on a clip's last frame before moving on. */
  pause?: number;
  /** Advance by itself; off loops the current clip. */
  auto?: boolean;
};

// [label, line, clip]
const chapters = [
  ["Agent plans", "The plan lands as a markdown file, not a chat reply.", "light/doc/handoff"],
  ["You comment", "Comment on a line, or drag over a sentence.", "light/select"],
  ["Agent revises", "It reads your comments and edits the file in place.", "light/doc/rewrite"],
] as const;

// [name, clip]: the six from the gallery, on their light pointer recordings
const feats = [
  ["Navigate", "light/navigate-mouse"],
  ["Menus", "light/menu-mouse"],
  ["Narrow terminals", "light/narrow"],
  ["Comment", "light/comment-mouse"],
  ["Edit", "light/edit"],
  ["Copy all", "light/all-mouse"],
] as const;

// ways to balance the rail labels: the line under the stage, the current row opening, every line shown, or the line hidden in place
const rails = ["center", "open", "all", "top"] as const;

const shadow = "shadow-[0_0_0_1px_rgba(20,22,28,0.1),0_24px_60px_-28px_rgba(20,22,28,0.35)]";
const soft = "bg-foreground/[0.04]";

/** Which clip is up, and how far through it is (0 to 1). */
function useReel() {
  const [at, setAt] = useState(0);
  const [t, setT] = useState(0);
  return {
    at,
    t,
    setT,
    // picking the clip that is already up leaves it running
    go: (i: number) => {
      if (i === at) return;
      setT(0);
      setAt(i);
    },
  };
}
type Reel = ReturnType<typeof useReel>;

/** The fixed box: every clip stacked, the current one faded in and playing. Click toggles play. */
function Screen({
  clips,
  reel,
  hold = false,
  radius = 12,
  frame = "shadow",
  speed = 1,
  pause = 1,
  auto = true,
}: Look & { clips: readonly string[]; reel: Reel; hold?: boolean }) {
  const box = useRef<HTMLButtonElement>(null);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const still = useReducedMotion();
  const [seen, setSeen] = useState(false);
  const [on, setOn] = useState(true);
  const [done, setDone] = useState(false);
  const { at, go } = reel;

  useEffect(() => setOn(!still), [still]);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.25 });
    io.observe(box.current!);
    return () => io.disconnect();
  }, []);
  // a new clip starts from its first frame
  useEffect(() => {
    setDone(false);
    const v = vids.current[at];
    if (v) v.currentTime = 0;
  }, [at]);
  useEffect(() => {
    vids.current.forEach((v, i) => {
      if (!v) return;
      v.playbackRate = speed;
      if (i === at && seen && on) v.play().catch(() => {});
      else v.pause();
    });
  }, [at, seen, on, speed]);
  // rest on the last frame, then move on (or replay while a feature is held)
  useEffect(() => {
    if (!done || !seen || !on) return;
    const id = setTimeout(() => {
      setDone(false);
      if (auto && !hold) return go((at + 1) % clips.length);
      const v = vids.current[at];
      if (!v) return;
      v.currentTime = 0;
      v.play().catch(() => {});
    }, pause * 1000);
    return () => clearTimeout(id);
  }, [done, seen, on, auto, hold, pause, at, clips.length, go]);

  return (
    <div
      className={frame === "flat" ? "bg-black/[0.03] p-2 sm:p-3" : ""}
      style={{ borderRadius: radius + (frame === "flat" ? 10 : 0) }}
    >
      <button
        ref={box}
        type="button"
        aria-label={on ? "Pause" : "Play"}
        onClick={() => setOn(!on)}
        className={`relative block aspect-[1580/1120] w-full cursor-pointer overflow-hidden bg-[#f7f7f2] ${frame === "flat" ? "" : shadow}`}
        style={{ borderRadius: radius }}
      >
        {clips.map((name, i) => (
          <video
            key={name}
            ref={(v) => void (vids.current[i] = v)}
            muted
            playsInline
            preload={i === at ? "auto" : "none"}
            disablePictureInPicture
            poster={`/media/${name}.png`}
            onTimeUpdate={(e) =>
              i === at && reel.setT(e.currentTarget.currentTime / (e.currentTarget.duration || 1))
            }
            onEnded={() => i === at && setDone(true)}
            className={`absolute inset-0 size-full object-contain transition-opacity duration-300 motion-reduce:transition-none ${i === at ? "" : "opacity-0"}`}
          >
            <source src={`/media/${name}.mp4`} type="video/mp4" />
          </video>
        ))}
      </button>
    </div>
  );
}

/** Progress as a soft fill growing from the left of whatever it sits in. */
function Fill({ t, tone = "bg-foreground/[0.06]" }: { t: number; tone?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-0 origin-left transition-transform duration-300 ease-linear motion-reduce:transition-none ${tone}`}
      style={{ transform: `scaleX(${t})` }}
    />
  );
}

/** A label that picks a clip; with `t` it carries the progress fill while current. */
function Pick({
  on,
  t,
  className = "",
  children,
  ...rest
}: ComponentProps<"button"> & { on: boolean; t?: number }) {
  return (
    <button
      type="button"
      aria-current={on}
      className={`relative overflow-hidden transition-colors ${on ? "text-foreground" : "text-muted-foreground hover:text-foreground"} ${className}`}
      {...rest}
    >
      {on && t !== undefined && <Fill t={t} />}
      <span className="relative">{children}</span>
    </button>
  );
}

/** One line that crossfades in a slot tall enough for two, so nothing below it moves. */
function Line({ id, className = "", children }: { id: number; className?: string; children: string }) {
  return (
    <div className={`relative h-10 text-sm leading-5 text-muted-foreground ${className}`}>
      <AnimatePresence initial={false}>
        <motion.p
          key={id}
          className="absolute inset-0 flex items-center justify-[inherit] text-balance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/** The loop as three chapters on one stage. */
export function Stage({
  variant = "tabs",
  ...look
}: Look & { variant?: (typeof stages)[number] }) {
  const reel = useReel();
  const { at, t, go } = reel;
  const [rail, setRail] = usePick("rail", rails);
  const screen = <Screen clips={chapters.map((c) => c[2])} reel={reel} {...look} />;
  const pills = chapters.map(([label], i) => (
    <Pick
      key={label}
      on={i === at}
      t={t}
      onClick={() => go(i)}
      className={`rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap sm:px-4 ${i === at ? "bg-background shadow-[0_1px_2px_rgba(20,22,28,0.08)]" : ""}`}
    >
      {label}
    </Pick>
  ));

  if (variant === "rail")
    return (
      <div className="@container">
        <div className="grid gap-5 @2xl:grid-cols-[210px_minmax(0,1fr)] @2xl:items-center @2xl:gap-8">
          <div className="order-last grid gap-1 @2xl:order-none">
            {chapters.map(([label, line], i) => (
              <Pick
                key={label}
                on={i === at}
                t={t}
                onClick={() => go(i)}
                className={`rounded-xl px-4 py-3 text-left ${i === at ? soft : ""}`}
              >
                <span className="block font-medium">{label}</span>
                {rail === "open" ? (
                  <span
                    aria-hidden={i !== at}
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ${i === at ? "grid-rows-[1fr]" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <span className="overflow-hidden text-sm leading-snug text-muted-foreground">
                      <span className="block pt-1">{line}</span>
                    </span>
                  </span>
                ) : (
                  rail !== "center" && (
                    <span
                      aria-hidden={rail === "top" && i !== at}
                      className={`mt-1 block text-sm leading-snug text-muted-foreground transition-opacity duration-300 ${i === at ? "" : rail === "all" ? "opacity-60" : "opacity-0"}`}
                    >
                      {line}
                    </span>
                  )
                )}
              </Pick>
            ))}
          </div>
          <div>
            {screen}
            {rail === "center" && (
              <Line id={at} className="mt-3 justify-center text-center">
                {chapters[at][1]}
              </Line>
            )}
          </div>
        </div>
        <Picker label="rail" names={rails} at={rail} set={setRail} className="mt-4" />
      </div>
    );

  if (variant === "caption")
    return (
      <div>
        {screen}
        <Line id={at} className="mt-4 justify-center text-center">
          {chapters[at][1]}
        </Line>
        <div className="flex justify-center gap-1.5">
          {chapters.map(([label], i) => (
            <button key={label} type="button" aria-label={label} aria-current={i === at} onClick={() => go(i)} className="py-2">
              <span
                className={`relative block h-1.5 overflow-hidden rounded-full bg-foreground/10 transition-[width] duration-300 ${i === at ? "w-8" : "w-1.5"}`}
              >
                {i === at && <Fill t={t} tone="bg-foreground/40" />}
              </span>
            </button>
          ))}
        </div>
      </div>
    );

  if (variant === "strip")
    return (
      <div>
        {screen}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          {chapters.map(([label, , clip], i) => (
            <button key={label} type="button" aria-current={i === at} onClick={() => go(i)} className="group min-w-0 text-left">
              <span className="relative block overflow-hidden rounded-lg bg-[#f7f7f2]">
                <img
                  src={`/media/${clip}.png`}
                  alt=""
                  className={`block aspect-[2/1] w-full object-cover object-top transition-opacity duration-300 ${i === at ? "" : "opacity-40 group-hover:opacity-75"}`}
                />
                {i === at && <Fill t={t} tone="bg-foreground/[0.08]" />}
              </span>
              <span
                className={`mt-2 block truncate text-xs font-medium transition-colors sm:text-[13px] ${i === at ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );

  if (variant === "panel")
    return (
      <div className={`@container rounded-2xl p-2 sm:p-3 ${soft}`}>
        <Screen clips={chapters.map((c) => c[2])} reel={reel} {...look} frame="shadow" />
        <div className="grid items-center gap-x-6 px-1 pt-3 @2xl:grid-cols-[auto_minmax(0,1fr)] @2xl:pt-2">
          <div className="flex gap-1">{pills}</div>
          <Line id={at} className="px-2 @2xl:justify-end @2xl:text-right">
            {chapters[at][1]}
          </Line>
        </div>
      </div>
    );

  return (
    <div>
      <div className={`mx-auto mb-4 flex w-fit max-w-full gap-1 rounded-full p-1 ${soft}`}>{pills}</div>
      {screen}
    </div>
  );
}

/** Features as a short list driving one stage: hover, focus or click picks, idle cycles. */
export function Tour({
  variant = "side",
  ...look
}: Look & { variant?: (typeof tours)[number] }) {
  const reel = useReel();
  const [hold, setHold] = useState(false);
  const { at, t, go } = reel;
  const screen = <Screen clips={feats.map((f) => f[1])} reel={reel} hold={hold} {...look} />;
  const list = (wrap: string, item: (on: boolean) => string, dot = false) => (
    <div
      className={wrap}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      {feats.map(([name], i) => (
        <Pick
          key={name}
          on={i === at}
          t={dot ? undefined : t}
          onClick={() => go(i)}
          onFocus={() => go(i)}
          onPointerEnter={(e) => e.pointerType === "mouse" && go(i)}
          className={`text-left font-medium ${item(i === at)}`}
        >
          {dot && (
            <span
              aria-hidden
              className={`mr-2 inline-block size-1.5 rounded-full bg-foreground/50 align-middle transition-opacity duration-300 ${i === at ? "" : "opacity-0"}`}
            />
          )}
          {name}
        </Pick>
      ))}
    </div>
  );

  if (variant === "chips")
    return (
      <div>
        {list(
          "mb-4 flex flex-wrap justify-center gap-1.5",
          (on) => `rounded-full px-3.5 py-1.5 text-[13px] ${on ? "bg-foreground/[0.07]" : soft}`,
        )}
        {screen}
      </div>
    );

  if (variant === "legend")
    return (
      <div className="@container">
        {screen}
        {list(
          "mt-4 grid grid-cols-2 gap-x-4 gap-y-1 @md:grid-cols-3 @3xl:grid-cols-6",
          () => "py-1 text-[13px] whitespace-nowrap",
          true,
        )}
      </div>
    );

  return (
    <div className="@container">
      <div className="grid gap-4 @2xl:grid-cols-[190px_minmax(0,1fr)] @2xl:items-center @2xl:gap-8">
        {list(
          "order-last flex flex-wrap gap-1 @2xl:order-none @2xl:flex-col @2xl:flex-nowrap",
          (on) => `rounded-lg px-3 py-2 text-sm @2xl:text-base ${on ? soft : ""}`,
        )}
        {screen}
      </div>
    </div>
  );
}
