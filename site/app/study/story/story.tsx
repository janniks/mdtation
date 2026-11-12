"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Agents } from "../../agents";
import "./story.css";

// Problem and document mode as one section: in a chat your note scrolls away, in a document it stays on its line.
// Everything hand-drawn sits on the TUI's own grid and palette, next to the real recording of the same thread.

export const variants = ["morph", "pair", "alarm", "slow", "verdict", "notes", "scroll", "swap"] as const;
export type Variant = (typeof variants)[number];
export type Props = {
  variant: Variant;
  copy?: string;
  speed?: number;
  pause?: number;
  width?: number;
  frame?: string;
  agents?: boolean;
};

const titles: Record<string, [string, string]> = {
  a: ["Chat scrolls away.", "Documents don't."],
  b: ["Chats move on.", "Documents stay."],
  c: ["In a chat, your note is gone.", "On its line, it stays."],
};

type Line = [string, string];
const note = "Five steps is a lot. Why not three?";

/** The session as it stands when you send your note. */
const base: Line[] = [
  ["tool", "Read(specs/onboarding.md)"],
  ["out", "13 lines"],
  ["say", "The spec has two sections:"],
  ["blank", ""],
  ["head", "Checklist"],
  ["find", "five steps on first login"],
  ["head", "Metrics"],
  ["find", "60% reach a first review in 24 hours"],
  ["blank", ""],
  ["note", note],
];

/** Background agents reporting in, all at once. */
const burst: Line[] = [
  ["blank", ""],
  ["agent", "background agent: tests finished"],
  ["out", "214 passed, 3 failed"],
  ["agent", "agent 2: refactored 6 files"],
  ["add", "src/auth/session.ts   +48 -31"],
  ["del", "src/billing/plan.ts   +12 -40"],
  ["add", "src/invite/link.ts    +27 -9"],
  ["del", "src/onboard/steps.ts  +3 -22"],
  ["add", "src/api/routes.ts     +19 -4"],
  ["add", "test/invite.test.ts   +61 -0"],
  ["tool", "Read(src/billing/trial.ts)"],
  ["out", "118 lines"],
  ["tool", "Update(src/billing/trial.ts)"],
  ["out", "+9 -3"],
  ["agent", "agent 3: lint pass"],
  ["out", "12 warnings fixed"],
  ["tool", "Bash(bun test billing)"],
  ["out", "41 passed"],
  ["agent", "agent 2: opened draft for review"],
  ["tool", "Read(src/onboard/flow.ts)"],
  ["out", "203 lines"],
  ["tool", 'Grep("skip", src/onboard)'],
  ["out", "no matches"],
  ["agent", "background agent: types check"],
  ["out", "0 errors"],
  ["tool", "Update(src/onboard/flow.ts)"],
  ["out", "+34 -12"],
  ["agent", "agent 4: migrated 3 fixtures"],
  ["add", "test/fixtures/users.json   +88 -70"],
  ["add", "test/fixtures/plans.json   +14 -14"],
  ["tool", "Bash(bun test)"],
  ["out", "255 passed"],
  ["agent", "agent 3: docs updated"],
  ["tool", "Read(README.md)"],
  ["out", "310 lines"],
  ["say", "All agents done. Summary below:"],
];

const lines = [...base, ...burst];
/** When each burst line lands: faster and faster. */
const flood = (from: number) =>
  burst.reduce<number[]>((acc, _, i) => [...acc, (acc[i - 1] ?? from) + Math.max(40, 420 * 0.86 ** i)], []);
const rows = 15; // visible chat rows
const idx = base.length - 1; // your note
const typing = 500; // you start typing
const sent = 1700; // the note lands in the log
const rush = 2900; // read it, then the agents report in, faster and faster
const times = [
  ...base.map((_, i) => (i === idx ? sent : 0)),
  ...flood(rush),
];
const end = times[times.length - 1] + 400;
const lift = times[idx + rows - 2]; // the note reaches the top row

type Scene = { lines: Line[]; times: number[]; ids: number[] };
const solo: Scene = { lines, times, ids: [idx] };

/** Three notes in one session, for the variant with more feedback. */
const asks = [note, "Can I bring it back later?", "Add the 24 hour target here."];
const chat: Line[] = [
  base[0],
  base[1],
  base[2],
  ["head", "Checklist"],
  ["find", "five steps on first login"],
  ["note", asks[0]],
  ["find", "dismissing hides it for good"],
  ["note", asks[1]],
  ["head", "Metrics"],
  ["find", "60% reach a first review in 24 hours"],
  ["note", asks[2]],
];
const ids = [5, 7, 10];
const trio: Scene = {
  lines: [...chat, ...burst],
  times: [...chat.map((_, i) => (ids.includes(i) ? 500 + 800 * ids.indexOf(i) : 0)), ...flood(3300)],
  ids,
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => 1 - (1 - clamp(v)) ** 3;
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * Scene time in ms, looping over `length` while the ref is on screen.
 * Speed 0 or reduced motion holds `still`; `seek` jumps.
 */
function useClock(speed: number, length: number, still: number) {
  const ref = useRef<HTMLDivElement>(null);
  const at = useRef(0);
  const [t, setT] = useState(still);
  useEffect(() => {
    const el = ref.current;
    if (!el || !speed || matchMedia("(prefers-reduced-motion: reduce)").matches) return setT(still);
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      at.current = (at.current + (last && now - last) * speed) % length;
      last = now;
      setT(at.current);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (e.isIntersecting) raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [speed, length, still]);
  return [ref, t, (to: number) => void (at.current = to)] as const;
}

function Lines({ t = end, hide, scene = solo }: { t?: number; hide?: boolean; scene?: Scene }) {
  return scene.lines.map(([kind, text], i) => (
    <div key={i} className={kind} style={{ opacity: hide && scene.ids.includes(i) ? 0 : clamp((t - scene.times[i]) / 90) }}>
      {text}
    </div>
  ));
}

/** An agent session: you send a note, then background agents push it off screen. `hide` leaves the note's row empty. */
function Log({ t, hide, scene = solo }: { t: number; hide?: boolean; scene?: Scene }) {
  const count = scene.times.reduce((n, a) => n + clamp((t - a) / 90), 0);
  const y = Math.max(0, count - rows);
  return (
    <div role="img" aria-label="An agent session where background agents push your note off screen">
      <div className="bar">agent session</div>
      <div className="log" style={{ ["--m" as string]: clamp(y / 2) }}>
        <div className="lines" style={{ transform: `translateY(calc(${-y} * var(--lh)))` }}>
          <Lines t={t} hide={hide} scene={scene} />
        </div>
        {y > 0.5 && <span className="more">↓ {Math.floor(count) - scene.lines.length + burst.length} new lines</span>}
      </div>
      <div className="input">
        &gt; {scene === solo && t < sent && note.slice(0, Math.max(0, Math.floor(((t - typing) / (sent - typing - 300)) * note.length)))}
      </div>
    </div>
  );
}

const head = [
  ["h1", "# Onboarding spec"],
  ["", ""],
  ["h2", "## Checklist"],
  ["", ""],
  ["", "New users get a five-step checklist on first login:"],
  ["", "profile, invite team, connect repo, first review, billing."],
];
const tail = [
  ["", "Each step opens a short guided overlay."],
  ["", "Dismissing the checklist hides it for good."],
  ["", ""],
  ["h2", "## Metrics"],
  ["", ""],
  ["", "We track completion per step and time to first review."],
];
const row = 8; // grid row of the comment, under the paragraph

/** The note as one strip: in the chat at k 0, a comment on its line at k 1. `bad` reddens it, `good` flashes it green. */
function Pin({
  k = 1,
  top = row,
  show = 1,
  text = note,
  bad = 0,
  good = 0,
}: {
  k?: number;
  top?: number;
  show?: number;
  text?: string;
  bad?: number;
  good?: number;
}) {
  return (
    <div
      className="pin"
      style={{
        top: `calc(${top + 0.25} * var(--lh))`,
        left: `${mix(1, 16, k)}ch`,
        right: "1ch",
        bottom: "auto",
        opacity: show,
        background: `color-mix(in oklab, color-mix(in oklab, ${k < 1 ? "#e9ece5" : "#e4e9de"}, #efc2ba ${bad * 100}%), #bfe2b0 ${good * 100}%)`,
        color: `color-mix(in oklab, #293127, #a23a2c ${bad * 100}%)`,
        boxShadow: `0 ${1.2 * Math.sin(Math.PI * k)}cqw ${3 * Math.sin(Math.PI * k)}cqw rgb(41 49 39 / 0.16)`,
      }}
    >
      <div>
        <i style={{ width: `${2 * (1 - k)}ch`, opacity: 1 - k }}>&gt; </i>
        {text}
      </div>
      <span style={{ opacity: k }}>you, now</span>
    </div>
  );
}

/** The TUI with the spec open: `slot` opens the comment row, `reply` the agent's answer under it. */
function Doc({ slot = 1, reply = 1, mark = 1, fresh }: { slot?: number; reply?: number; mark?: number; fresh?: boolean }) {
  const text = ([kind, s]: string[], i: number) => (
    <div key={i} className={kind}>
      {s}
    </div>
  );
  return (
    <div role="img" aria-label="The same note as a comment on its line in the document, with the agent's reply under it">
      <div className="bar">
        <span>File View Comments Help</span>
        <span>onboarding.md</span>
      </div>
      <div className="crumb">Onboarding spec / Checklist</div>
      <div className="body">
        {head.map(text)}
        <div className="slot" style={{ height: `calc(${slot + 2 * reply} * var(--lh))` }}>
          <div className="reply" style={{ top: `calc(${slot} * var(--lh))`, opacity: reply, background: fresh ? "#d6e3cf" : undefined }}>
            41% of users drop off at step 4. Three steps{"\n"}would lose the billing nudge.
            <span>claude, now</span>
          </div>
        </div>
        {tail.map(text)}
      </div>
      <div className="mark" style={{ transform: `scale(${mark})` }} />
      <div className="bar foot">
        <span>
          Ln 5/13{"  "}
          {reply > 0.5 ? "2 comments" : slot > 0.5 ? "1 comment" : "0 comments"}
        </span>
        <b>VIEW</b>
      </div>
    </div>
  );
}

/** A real recording: poster first, plays while on screen and `on`, from the start each time `on` flips. */
function Rec({ on = true }: { on?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting));
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (on) ref.current!.currentTime = 0;
  }, [on]);
  useEffect(() => {
    const v = ref.current!;
    if (seen && on && !matchMedia("(prefers-reduced-motion: reduce)").matches) v.play().catch(() => {});
    else v.pause();
  }, [seen, on]);
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      poster="/media/light/doc/thread.png"
      aria-label="A comment thread stays on its paragraph while the agent answers in it"
      src="/media/light/doc/thread.mp4"
    />
  );
}

type Box = { flat: boolean; className?: string; children: ReactNode };

/** One terminal window: soft shadow, or flat on a mat. */
function Frame({ flat, className = "", children }: Box) {
  return (
    <div className={`${flat ? "rounded-2xl bg-foreground/[0.03] p-3 sm:p-5" : ""} ${className}`}>
      <div className={`term ${flat ? "rounded-lg" : "rounded-xl shadow-[0_24px_60px_-32px_rgb(41_49_39/0.4),0_2px_6px_-2px_rgb(41_49_39/0.08)]"}`}>
        {children}
      </div>
    </div>
  );
}

/** Both lines as one title; the line that is happening is the dark one. */
function Title({ copy, on, bad = 0 }: { copy: [string, string]; on: boolean; bad?: number }) {
  return (
    <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:mb-10 sm:text-3xl">
      {copy.map((s, i) => (
        <span
          key={s}
          className={`block transition-colors duration-700 ${on === !!i ? "" : "text-muted-foreground/60"}`}
          style={!i && bad ? { color: `color-mix(in oklab, var(--foreground), #b4483a ${bad * 75}%)`, transition: "none" } : undefined}
        >
          {s}
        </span>
      ))}
    </h2>
  );
}

type Part = { copy: [string, string]; speed: number; pause: number; flat: boolean };

/* The racing chat next to the real recording; the two lines are the only copy. */
function Pair({ copy, speed, pause, flat }: Part) {
  const length = end + pause * 1000 * speed + 500;
  const [ref, t] = useClock(speed, length, end);
  return (
    <div ref={ref} className="grid gap-10 md:grid-cols-2 md:gap-7 [&>*]:min-w-0">
      {copy.map((s, i) => (
        <figure key={s}>
          <figcaption className={`mb-5 text-center text-2xl font-semibold tracking-tight sm:text-3xl ${i ? "" : "text-muted-foreground/60"}`}>
            {s}
          </figcaption>
          <Frame flat={flat}>
            {i ? (
              <Rec />
            ) : (
              <div style={{ opacity: Math.min(clamp(t / 300), 1 - clamp((t - length + 500) / 400)) }}>
                <Log t={t} />
              </div>
            )}
          </Frame>
        </figure>
      ))}
    </div>
  );
}

type Mood = {
  /** The chat turns red and shakes as the note is pushed away. */
  alarm?: boolean;
  /** Ms the chat freezes before the note moves. */
  hold?: number;
  /** Ms the note takes to cross over. */
  carry?: number;
  /** A soft green flash when the note lands. */
  glow?: boolean;
};

/* One frame: the chat races off, the note lifts out and lands on its line, the agent answers there. */
function Morph({ copy, speed, pause, flat, alarm, hold = 0, carry = 1000, glow }: Part & Mood) {
  const go = lift + hold;
  const land = go + carry;
  const play = land + 2600;
  const length = play + pause * 1000 * speed + 500;
  const [ref, t] = useClock(speed, length, play);
  const k = ease((t - go) / carry);
  const out = 1 - clamp((t - length + 500) / 400);
  // a held chat stops at the moment the note reaches the top
  const at = hold ? Math.min(t, lift) : t;
  const count = times.reduce((n, a) => n + clamp((at - a) / 90), 0);
  const bad = alarm ? clamp((t - rush) / (lift - rush)) ** 2 * (1 - clamp((t - go) / 400)) : 0;
  const good = glow ? Math.sin(Math.PI * clamp((t - land) / 1100)) : 0;
  return (
    <div ref={ref}>
      <Title copy={copy} on={t > go + 400} bad={bad} />
      <div
        style={{
          transform: `translate(${Math.sin(t / 19) * 3 * bad}px, ${Math.cos(t / 23) * 2 * bad}px) rotate(${Math.sin(t / 31) * 0.3 * bad}deg)`,
        }}
      >
        <Frame flat={flat} className="mx-auto max-w-[760px]">
          <div style={{ opacity: Math.min(clamp(t / 300), 1 - 0.5 * clamp((t - lift) / 300) - 0.5 * clamp((t - go) / 500)) }}>
            <Log t={at} hide />
          </div>
          <div style={{ inset: 0, pointerEvents: "none", background: `rgb(206 72 58 / ${0.16 * bad})` }} />
          <div style={{ opacity: Math.min(clamp((t - go - 250 + Math.min(hold, 650)) / 500), out) }}>
            <Doc slot={k} mark={ease((t - land) / 250)} reply={ease((t - land - 1200) / 400)} fresh={t > land + 1200 && t < land + 1700} />
          </div>
          <div style={{ inset: 0, pointerEvents: "none", boxShadow: `inset 0 0 0 ${0.5 * good}cqw rgb(84 123 72 / ${0.45 * good})` }} />
          <Pin
            k={k}
            top={mix(1.5 + Math.max(1, idx - Math.max(0, count - rows)), row, k)}
            show={Math.min(clamp((t - sent) / 90), out)}
            bad={bad}
            good={good}
          />
        </Frame>
      </div>
    </div>
  );
}

/** The spec with a comment under three of its lines; `open` is how far each row has opened. */
function Sheet({ open }: { open: number[] }) {
  const text = ([kind, s]: string[], i: number) => (
    <div key={i} className={kind}>
      {s}
    </div>
  );
  const slot = (i: number) => <div className="slot" style={{ height: `calc(${open[i]} * var(--lh))` }} />;
  return (
    <div role="img" aria-label="Three notes, each a comment on the line it is about">
      <div className="bar">
        <span>File View Comments Help</span>
        <span>onboarding.md</span>
      </div>
      <div className="crumb">Onboarding spec / Checklist</div>
      <div className="body">
        {head.map(text)}
        {slot(0)}
        {tail.slice(0, 2).map(text)}
        {slot(1)}
        {tail.slice(2).map(text)}
        {slot(2)}
      </div>
      {[6, 9 + open[0], 13 + open[0] + open[1]].map((top, i) => (
        <div key={i} className="mark" style={{ top: `calc(${top} * var(--lh))`, transform: `scale(${ease(open[i] * 4 - 3)})` }} />
      ))}
      <div className="bar foot">
        <span>
          Ln 5/13{"  "}
          {open.filter((k) => k > 0.9).length} comments
        </span>
        <b>VIEW</b>
      </div>
    </div>
  );
}

/* More feedback: three notes cling to the top of the racing chat, then each crosses to its own line. */
function Trio({ copy, speed, pause, flat }: Part) {
  const go = trio.times[rows + ids[2] - 4] + 700; // all three stuck at the top, and a beat
  const land = go + 2 * 700 + 1500;
  const play = land + 1600;
  const length = play + pause * 1000 * speed + 500;
  const [ref, t] = useClock(speed, length, play);
  const out = 1 - clamp((t - length + 500) / 400);
  const at = Math.min(t, go);
  const y = Math.max(0, trio.times.reduce((n, a) => n + clamp((at - a) / 90), 0) - rows);
  const open = ids.map((_, j) => ease((t - go - j * 700) / 1500));
  const dest = [row, 10 + open[0], 14 + open[0] + open[1]];
  return (
    <div ref={ref}>
      <Title copy={copy} on={t > go + 400} />
      <Frame flat={flat} className="mx-auto max-w-[760px]">
        <div style={{ opacity: Math.min(clamp(t / 300), 1 - 0.5 * clamp((t - go + 500) / 300) - 0.5 * clamp((t - go) / 500)) }}>
          <Log t={at} hide scene={trio} />
        </div>
        <div style={{ opacity: Math.min(clamp((t - go + 300) / 500), out) }}>
          <Sheet open={open} />
        </div>
        {ids.map((id, j) => (
          <Pin
            key={id}
            text={asks[j]}
            k={open[j]}
            top={mix(1.5 + Math.max(1 + j, id - y), dest[j], open[j])}
            show={Math.min(clamp((t - trio.times[id]) / 90), out)}
            good={Math.sin(Math.PI * clamp((t - go - j * 700 - 1500) / 900))}
          />
        ))}
      </Frame>
    </div>
  );
}

/* A tall chat column keeps scrolling behind a soft mask; the document card in front never moves. */
function Scroll({ copy, speed, flat }: Part) {
  return (
    <div>
      <Title copy={copy} on />
      <div className="relative mx-auto aspect-[4/5] max-w-[860px] sm:aspect-[16/10]">
        <div className="column absolute inset-y-0 left-0 w-full opacity-70 sm:w-[72%]" aria-hidden>
          {/* a CSS loop on the compositor: no per-frame React work behind the still card */}
          <div className="lines" style={{ animationDuration: `${9 / (speed || 1)}s`, animationPlayState: speed ? undefined : "paused" }}>
            <Lines />
            <Lines />
          </div>
        </div>
        <Frame flat={flat} className="absolute inset-x-[5%] top-1/2 -translate-y-1/2 sm:right-0 sm:left-auto sm:w-[62%]">
          <Doc />
          <Pin />
        </Frame>
      </div>
    </div>
  );
}

/* One stage, a soft switch: the same note in a chat, then in a document. Flips by itself, or on click. */
function Swap({ copy, speed, pause, flat }: Part) {
  const chat = end + pause * 1000 * speed;
  const length = chat + 15000 * speed; // the recording runs 15 s
  const [ref, t, seek] = useClock(speed, length, length - 1);
  const on = t >= chat;
  return (
    <div ref={ref}>
      <Title copy={copy} on={on} />
      <div className="relative mx-auto mb-5 grid w-52 grid-cols-2 rounded-full bg-foreground/[0.05] p-1 text-sm font-medium">
        <span
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform duration-500"
          style={{ transform: `translateX(${on ? 100 : 0}%)` }}
        />
        {["Chat", "Document"].map((s, i) => (
          <button
            key={s}
            aria-pressed={on === !!i}
            onClick={() => seek(i * chat)}
            className={`relative rounded-full py-1.5 transition-colors duration-500 ${on === !!i ? "" : "text-muted-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <Frame flat={flat} className="mx-auto max-w-[760px]">
        <div className="transition-opacity duration-500" style={{ opacity: on ? 0 : 1 }}>
          <Log t={t} />
        </div>
        <div className="transition-opacity duration-500" style={{ opacity: on ? 1 : 0 }}>
          <Rec on={on} />
        </div>
      </Frame>
    </div>
  );
}

const parts = {
  pair: Pair,
  morph: Morph,
  alarm: (p: Part) => <Morph {...p} alarm hold={700} />,
  slow: (p: Part) => <Morph {...p} hold={1100} carry={2600} glow />,
  verdict: (p: Part) => <Morph {...p} alarm hold={1100} carry={2600} glow />,
  notes: Trio,
  scroll: Scroll,
  swap: Swap,
};

/** Problem and document mode as one homepage section. */
export function Story({ variant, copy = "a", speed = 1, pause = 3, width = 1040, frame = "soft", agents = true }: Props) {
  const Part = parts[variant];
  return (
    <section className="story mx-auto px-5 sm:px-8" style={{ maxWidth: width }}>
      <Part copy={titles[copy] ?? titles.a} speed={speed} pause={pause} flat={frame === "flat"} />
      {agents && <Agents className="mt-10 justify-center sm:mt-12" />}
    </section>
  );
}
