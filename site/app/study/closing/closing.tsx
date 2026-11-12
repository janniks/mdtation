"use client";

// Ways to end the homepage on the install line (`Closing`), and a compact friends block (`Kin`).
// Every variant keeps to one or two elements, soft fills instead of borders, and holds its size on every interaction.

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { MotionConfig, motion } from "motion/react";
import { Command } from "../../command";
import { GITHUB, INSTALL, NPM, PROMPT } from "../../header";
import {
  Agentation,
  AgentationWord,
  Claude,
  Codex,
  Cursor,
  GitHub,
  Herdr,
  Hunk,
  OpenTUI,
} from "../../icons";
import { grow } from "../../lab/page-4/grow";
import "../../lab/page-4/garden.css";
import { sample, type Ranges } from "../flowers/ranges/flower";
import { Picker, usePick } from "../../pick";
import "./closing.css";

// the first of each list is the one the homepage ships
export const closings = ["prompt", "panel", "garden", "dots", "stone", "quiet"] as const;
export const kins = ["tabs", "row", "line", "cards", "quote"] as const;

/** Dials shared by both blocks: max width in px, corner radius in px, fill strength 0..0.1, motif amount 0..1, typing speed. */
export type Look = {
  width?: number;
  radius?: number;
  tone?: number;
  amount?: number;
  speed?: number;
};

const fill = (tone: number) => `color-mix(in oklab, var(--foreground) ${tone * 100}%, transparent)`;
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** `on` once the element has been on screen, `live` while it is. */
function useView<T extends Element>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setLive(entry.isIntersecting);
        if (entry.isIntersecting) setOn(true);
      },
      { threshold: 0.4 },
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);
  return [ref, on, live] as const;
}

/** Fades a part up when seen, after `delay` seconds, then rests. */
function Rise({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

const chip = "flex items-center rounded-xl font-mono text-sm";

/** The install command and the prompt chip, side by side; `dark` suits a dark card. */
function Row({ tone = 0.04, dark }: { tone?: number; dark?: boolean }) {
  const style = { background: dark ? "rgb(255 255 255 / 0.07)" : fill(tone) };
  return (
    <div
      className={`flex max-w-full flex-wrap items-center justify-center gap-2.5 ${dark ? "text-white/50 [&_button:hover]:text-white" : "text-neutral-500"}`}
    >
      <Command className={dark ? "text-white/90" : "text-neutral-800"} style={style} />
      <Ask kind="tilt" style={style} dark={dark} />
    </div>
  );
}

/** The open-source line with its GitHub button. */
function Source({ dark }: { dark?: boolean }) {
  return (
    <p
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm ${dark ? "text-white/45" : "text-muted-foreground"}`}
    >
      Open source, MIT licensed.
      <a
        href={GITHUB}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${dark ? "bg-white/[0.07] text-white/70 hover:bg-white/[0.12] hover:text-white" : "bg-foreground/[0.05] text-foreground/70 hover:bg-foreground/[0.09] hover:text-foreground"}`}
      >
        <GitHub className="size-3.5" />
        Star on GitHub
      </a>
    </p>
  );
}

const links = [
  ["https://x.com/janniksco", "twitter"],
  [GITHUB, "github"],
  [NPM, "npm"],
  [`${GITHUB}/issues`, "issues"],
] as const;

function Credits() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 font-mono text-xs text-muted-foreground/80">
      <span>mdtation MIT 2026 janniks</span>
      <nav className="flex gap-5">
        {links.map(([href, label]) => (
          <a
            key={label}
            href={href}
            className="transition-colors duration-200 hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}

const title = "text-2xl font-semibold tracking-tight text-balance sm:text-3xl";

/** One soft panel (or the dark Stone card): title, install row, the open-source line beneath. */
function Panel({ radius, tone, dark }: { radius: number; tone: number; dark?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center gap-7 px-5 py-12 text-center sm:py-16 ${dark ? "text-white" : ""}`}
      style={{ borderRadius: radius, background: dark ? "#1d1e1b" : fill(tone) }}
    >
      <Rise>
        <h2 className={title}>Try it on your next plan</h2>
      </Rise>
      <Rise delay={0.15} className="max-w-full">
        <Row tone={dark ? 0 : 0.045} dark={dark} />
      </Rise>
      <Rise delay={0.4}>
        <Source dark={dark} />
      </Rise>
    </div>
  );
}

const seeds = Array.from({ length: 12 }, (_, i) => String(i));
// tilt ships: the first of the list
const asks = ["tilt", "stack", "bare", "after", "cycle"] as const;
const bots = [Claude, Codex, Cursor];

/** Copies `text` on click; `done` is true for a moment after. */
function useCopy(text: string) {
  const [done, setDone] = useState(false);
  return [
    done,
    () =>
      navigator.clipboard.writeText(text).then(() => {
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }),
  ] as const;
}

/** The copy-prompt button, with a few agent marks where the copy icon was. */
export function Ask({
  kind = "tilt",
  style,
  dark,
  surface = style ? "" : "bg-foreground/[0.04] hover:bg-foreground/[0.06]",
}: {
  kind?: (typeof asks)[number];
  style?: CSSProperties;
  dark?: boolean;
  /** Classes for the chip's fill and border. */
  surface?: string;
}) {
  const [done, copy] = useCopy(PROMPT);
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (kind !== "cycle" || still()) return;
    const id = setInterval(() => setAt((n) => (n + 1) % bots.length), 2200);
    return () => clearInterval(id);
  }, [kind]);
  const tile = `inline-flex size-6 items-center justify-center rounded-full ${dark ? "bg-white/15 text-white/80" : "bg-background text-foreground/60 shadow-[0_1px_2px_rgba(20,22,28,0.1)]"}`;
  const marks = {
    // three small round tiles, overlapping
    stack: bots.map((Icon, i) => (
      <span key={i} className={`${tile} -ml-2 first:ml-0`}>
        <Icon className="size-3.5" />
      </span>
    )),
    // just the marks, no tiles
    bare: bots.map((Icon, i) => (
      <Icon key={i} className="ml-1.5 size-4 text-foreground/45 first:ml-0" />
    )),
    // tiles tilted like stickers, straightening on hover
    tilt: bots.map((Icon, i) => (
      <span
        key={i}
        className={`${tile} -ml-1.5 rounded-md transition-transform duration-300 first:ml-0 group-hover:rotate-0 ${["-rotate-12", "rotate-6", "-rotate-3"][i]}`}
      >
        <Icon className="size-3.5" />
      </span>
    )),
    after: bots.map((Icon, i) => (
      <Icon key={i} className="ml-1.5 size-4 text-foreground/45 first:ml-0" />
    )),
    // one tile, the marks taking turns
    cycle: (
      <span className={`${tile} grid`}>
        {bots.map((Icon, i) => (
          <Icon
            key={i}
            className={`col-start-1 row-start-1 size-3.5 transition-opacity duration-700 ${i === at ? "" : "opacity-0"}`}
          />
        ))}
      </span>
    ),
  }[kind];
  const row = <span className="flex items-center">{marks}</span>;
  return (
    <button
      type="button"
      onClick={copy}
      style={style}
      className={`group ${chip} cursor-copy gap-2.5 py-2.5 pr-4 pl-2.5 font-sans text-sm transition-colors duration-200 ${surface} ${dark ? "text-white/50 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}`}
    >
      {kind !== "after" && row}
      <span className="grid">
        <span
          className={`col-start-1 row-start-1 transition-opacity duration-300 ${done ? "opacity-0" : ""}`}
        >
          {kind === "after" ? "Copy prompt for" : "Copy prompt"}
        </span>
        <span
          className={`col-start-1 row-start-1 transition-opacity duration-300 ${done ? "" : "opacity-0"}`}
          aria-hidden
        >
          Copied
        </span>
      </span>
      {kind === "after" && row}
    </button>
  );
}

/** The command typed out behind a block caret when seen; the caret then rests, blinking slowly. Click the command to copy it. */
function Prompt({ speed }: { speed: number }) {
  const [ref, on, live] = useView<HTMLDivElement>();
  const [n, setN] = useState(0);
  const [done, copy] = useCopy(INSTALL);
  const [kind, setKind] = usePick("prompt button", asks);
  const typed = n >= INSTALL.length;
  useEffect(() => {
    if (!on || typed) return;
    if (still() || speed === 0) return setN(INSTALL.length);
    // a breath before the first key, a longer beat after each space
    const timer = setTimeout(
      () => setN(n + 1),
      (n === 0 ? 600 : INSTALL[n - 1] === " " ? 170 : 75) / speed,
    );
    return () => clearTimeout(timer);
  }, [on, n, typed, speed]);
  return (
    <div ref={ref} className="flex flex-col items-center gap-6 text-center">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy $ ${INSTALL}`}
        className="relative cursor-copy rounded-xl px-4 py-2 font-mono text-lg whitespace-nowrap text-foreground transition-colors duration-200 hover:bg-foreground/[0.03] sm:text-[28px]"
      >
        <span aria-hidden>
          <span className="text-foreground/30">$ </span>
          {INSTALL.slice(0, n)}
          <span
            className="caret text-foreground/80"
            data-rest={typed || undefined}
            data-still={!live || undefined}
          />
          <span className="invisible">{INSTALL.slice(n)}</span>
        </span>
        <span
          className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 font-sans text-xs text-muted-foreground transition-opacity duration-300 ${done ? "" : "opacity-0"}`}
          aria-live="polite"
        >
          Copied
        </span>
      </button>
      <div className={`transition-opacity duration-700 ${typed ? "" : "opacity-0"}`}>
        <Ask kind={kind} />
        <Picker label="prompt button" names={asks} at={kind} set={setKind} className="mt-1" />
      </div>
    </div>
  );
}

/** Page-4's ranges, kept short and upright for a small row. */
const flowers: Ranges = {
  stem: ["straight", "curved", "sbend"],
  stalk: ["sage", "moss"],
  leaf: ["oval", "lance", "heart", "blade"],
  side: ["alt", "pair"],
  vein: ["none", "rib"],
  head: ["round", "pointed", "teardrop", "daisy", "tulip", "cup", "bud"],
  color: ["rose", "coral", "ochre", "butter", "lilac", "sky", "teal", "plum"],
  length: [90, 200],
  bend: [0.25, 0.6],
  thick: [4.6, 5.2],
  leaves: [0, 3],
  size: [0.8, 1.3],
  angle: [35, 65],
  petals: [5, 9],
  layers: [1, 2],
  radius: [24, 36],
  width: [0.75, 1.15],
  center: [0.15, 0.35],
  face: [0.65, 1],
  tilt: [0, 10],
  sway: [1.5, 4],
};

/** `count` flowers on one ground line, each drawing itself in a beat after its neighbour. */
function Bed({
  side,
  count,
  seed,
  className,
}: {
  side: string;
  count: number;
  seed: number;
  className: string;
}) {
  const uid = useId().replace(/:/g, "");
  const html = useMemo(
    () =>
      Array.from({ length: count }, (_, i) =>
        grow(
          sample(flowers, `closing${seed || ""}.${side}.${i}`),
          `closing${seed || ""}.${side}.${i}`,
          { uid: `${uid}${i}`, scale: 0.42, stems: true },
        ),
      ),
    [side, count, seed, uid],
  );
  return (
    <div aria-hidden className={`h-[132px] min-w-0 items-end overflow-hidden ${className}`}>
      {html.map((svg, i) => (
        <span
          key={`${seed}.${i}`}
          className="-mx-1 shrink-0 leading-[0]"
          style={{ "--g": `${i * 220}ms` } as CSSProperties}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ))}
    </div>
  );
}

/** The install row standing in a small row of flowers that draw in by path, then rest. */
function Garden({ amount }: { amount: number }) {
  const [ref, on] = useView<HTMLDivElement>();
  const count = Math.round(amount * 8);
  // seed 0 is the planted one; dev shows dots under the bed to try others
  const [seed, plant] = usePick("seed", seeds);
  return (
    <>
      <div
        ref={ref}
        className="sprout grid items-end justify-items-center gap-x-4 sm:grid-cols-[1fr_auto_1fr]"
        data-on={on || undefined}
      >
        <Bed
          side="left"
          count={count}
          seed={Number(seed)}
          className="flex justify-end sm:justify-self-end"
        />
        <div className="max-w-full pb-1">
          <Row />
        </div>
        <Bed
          side="right"
          count={count}
          seed={Number(seed)}
          className="hidden justify-start sm:flex sm:justify-self-start"
        />
      </div>
      <Picker label="seed" names={seeds} at={seed} set={plant} className="mt-3" />
    </>
  );
}

/**
 * The install row in a hole cut out of a halftone field: whole cells left unprinted, so the hole is square and its edges fall between dots.
 * The dots ripple out from the hole when seen, then rest.
 */
function Dots({ amount }: { amount: number }) {
  const host = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<CSSProperties>();
  useEffect(() => {
    const canvas = host.current!;
    const ctx = canvas.getContext("2d")!;
    const pitch = 10;
    let raf = 0;
    let start = 0;
    let seen = false;

    function draw(u: number) {
      const dpr = Math.min(2, devicePixelRatio);
      const [cw, ch] = [canvas.clientWidth, canvas.clientHeight];
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [cols, rows] = [Math.floor(cw / pitch), Math.floor(ch / pitch)];
      // knockout in whole cells, one cell of air around the label, centred on the grid
      // (one more where needed, so the same count of cells is left on either side)
      const even = (n: number, of: number) => n + ((of - n) % 2);
      const [kc, kr] = [
        even(Math.ceil(label.current!.offsetWidth / pitch) + 2, cols),
        even(Math.ceil(label.current!.offsetHeight / pitch) + 2, rows),
      ];
      const [c0, r0] = [(cols - kc) / 2, (rows - kr) / 2];
      // the grid itself sits centred in the canvas
      const [ox, oy] = [(cw - cols * pitch) / 2, (ch - rows * pitch) / 2];
      ctx.translate(ox, oy);
      setBox((old) => {
        const next = {
          left: ox + c0 * pitch,
          top: oy + r0 * pitch,
          width: kc * pitch,
          height: kr * pitch,
        };
        return JSON.stringify(old) === JSON.stringify(next) ? old : next;
      });
      const [mx, my] = [(c0 + kc / 2) * pitch, (r0 + kr / 2) * pitch];
      const ease = 1 - (1 - u) ** 3;
      ctx.fillStyle = "#7d8f82";
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          if (i >= c0 && i < c0 + kc && j >= r0 && j < r0 + kr) continue;
          const [x, y] = [(i + 0.5) * pitch, (j + 0.5) * pitch];
          // distance from the hole's edge, so the rings are square-ish like the hole
          const d = Math.hypot(
            Math.max(0, Math.abs(x - mx) - (kc * pitch) / 2),
            Math.max(0, Math.abs(y - my) - (kr * pitch) / 2),
          );
          const shown = Math.min(1, Math.max(0, (ease * (cw / 2 + 80) - d) / 80));
          const c =
            amount *
            shown *
            (0.1 + 0.5 * (0.5 + 0.5 * Math.sin(d / 14 - ease * 9)) ** 2) *
            Math.max(0, 1 - d / (cw * 0.55));
          if (c < 0.01) continue;
          ctx.beginPath();
          ctx.arc(x, y, pitch * 0.5 * Math.sqrt(c), 0, Math.PI * 2);
          ctx.fill();
        }
    }

    function loop(now: number) {
      start ||= now;
      const u = Math.min(1, (now - start) / 5000);
      draw(u);
      if (u < 1) raf = requestAnimationFrame(loop);
    }

    const rest = still();
    draw(rest ? 1 : 0);
    // the ripple runs while on screen; offscreen it holds, and picks up where it left
    const observer = new IntersectionObserver(
      ([entry]) => {
        seen = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (seen && !rest) raf = requestAnimationFrame(loop);
      },
      { threshold: 0.4 },
    );
    observer.observe(canvas);
    const size = new ResizeObserver(() => draw(rest || start ? 1 : 0));
    size.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      size.disconnect();
    };
  }, [amount]);
  return (
    <div className="relative">
      <canvas ref={host} aria-hidden className="block h-[260px] w-full sm:h-[240px]" />
      <div className="absolute flex items-center justify-center" style={box ?? { inset: 0 }}>
        <div ref={label} className="w-max max-w-[calc(100vw-72px)]">
          <Row />
        </div>
      </div>
    </div>
  );
}

/** A big line of text; the command in it is the only interactive thing, and swaps to "Copied" in place. */
function Quiet() {
  const [done, setDone] = useState(false);
  const fade = (show: boolean) =>
    `col-start-1 row-start-1 transition-opacity duration-300 ${show ? "" : "opacity-0"}`;
  return (
    <p className="text-center text-2xl leading-[1.5] font-medium tracking-tight text-balance text-foreground/60 sm:text-4xl sm:leading-[1.4]">
      Your next plan is waiting.{" "}
      <button
        aria-label={`Copy ${INSTALL}`}
        onClick={() =>
          navigator.clipboard.writeText(INSTALL).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          })
        }
        className="inline-grid justify-items-center rounded-xl bg-foreground/[0.05] px-[0.5em] py-[0.1em] align-baseline font-mono text-[0.72em] font-normal tracking-normal whitespace-nowrap text-foreground transition-colors duration-200 hover:bg-foreground/[0.09]"
      >
        <span className={fade(!done)}>{INSTALL}</span>
        <span className={fade(done)} aria-hidden>
          Copied
        </span>
      </button>
    </p>
  );
}

/** The last block of the page: the install line comes back, with the open-source line and the credits. */
export function Closing({
  variant,
  width = 760,
  radius = 24,
  tone = 0.03,
  amount = 0.5,
  speed = 1,
}: { variant: (typeof closings)[number] } & Look) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto w-full" style={{ maxWidth: width }}>
        {variant === "panel" && <Panel radius={radius} tone={tone} />}
        {variant === "stone" && <Panel radius={radius} tone={tone} dark />}
        {variant === "prompt" && <Prompt speed={speed} />}
        {variant === "garden" && <Garden amount={amount} />}
        {variant === "dots" && <Dots amount={amount} />}
        {variant === "quiet" && <Quiet />}
        {(variant === "prompt" || variant === "garden" || variant === "dots") && (
          <div className="mt-8">
            <Source />
          </div>
        )}
        <Credits />
      </div>
    </MotionConfig>
  );
}

// [icon, name, phrase, href]: the homepage's friends, each cut to one short phrase
const friends = [
  [Herdr, "herdr", "The multiplexer you may already use.", "https://github.com/herdrdev/herdr"],
  [Hunk, "hunk", "Diff review with comments for agents.", "https://github.com/modem-dev/hunk"],
  [
    Agentation,
    "agentation",
    "Point your agent at an element.",
    "https://github.com/benjitaylor/agentation",
  ],
  [OpenTUI, "OpenTUI", "The terminal renderer underneath.", "https://github.com/sst/opentui"],
] as const;

/** A friend's name with its mark hovering beside it, tilted; links out when given `href`. */
function Float({
  icon: Icon,
  at,
  href,
  children,
}: {
  icon: typeof Hunk;
  at: string;
  href?: string;
  children: string;
}) {
  const Tag = href ? "a" : "span";
  return (
    <Tag
      {...(href && { href, target: "_blank", rel: "noreferrer" })}
      className="group relative inline-block"
    >
      <Icon
        className={`absolute rounded-sm border border-black/[0.06] bg-card p-[0.08em] text-primary transition-transform duration-300 ease-out group-hover:-translate-y-1.5 ${at}`}
      />
      {children}
    </Tag>
  );
}

/** The quote line; with `link`, the three names link to their projects. */
function Quote({ link }: { link?: boolean }) {
  const href = (i: number) => (link ? friends[i][3] : undefined);
  return (
    <blockquote className="text-center text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl">
      <span className="text-primary">“</span>If{" "}
      <Float
        icon={Herdr}
        href={href(0)}
        at="-rotate-12 -bottom-[calc(0.5em-3px)] left-[22%] size-[0.8em]"
      >
        herdr
      </Float>
      ,{" "}
      <Float icon={Hunk} href={href(1)} at="rotate-6 -top-[0.2em] -right-[0.35em] size-[0.6em]">
        hunk
      </Float>
      , and{" "}
      <Float
        icon={AgentationWord}
        href={href(2)}
        at="-rotate-3 -bottom-[calc(0.8em-6px)] left-[10%] h-[0.85em] w-auto px-[0.15em] pt-[0.1em] pb-[calc(0.1em-2px)]"
      >
        agentation
      </Float>{" "}
      had a baby.<span className="text-primary">”</span>
    </blockquote>
  );
}

const out = { target: "_blank", rel: "noreferrer" };

/** Four soft chips; the hovered or focused one shows its phrase in a line that is always there. */
function Chips({ radius, tone }: { radius: number; tone: number }) {
  const [at, setAt] = useState(-1);
  return (
    <div onPointerLeave={() => setAt(-1)} onBlur={() => setAt(-1)}>
      <div className="flex flex-wrap justify-center gap-2">
        {friends.map(([Icon, name, , href], i) => (
          <a
            key={name}
            href={href}
            {...out}
            onPointerEnter={() => setAt(i)}
            onFocus={() => setAt(i)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 font-mono text-[13px] transition-colors duration-200 ${at === i ? "text-foreground" : "text-foreground/60"}`}
            style={{ borderRadius: radius, background: fill(at === i ? tone * 2 : tone) }}
          >
            <Icon className="h-3.5 w-auto shrink-0" />
            {name}
          </a>
        ))}
      </div>
      <p
        className="mt-4 grid h-5 justify-items-center text-[13px] text-muted-foreground"
        aria-live="polite"
      >
        {friends.map(([, name, phrase], i) => (
          <span
            key={name}
            className={`col-start-1 row-start-1 transition-opacity duration-300 ${at === i ? "" : "opacity-0"}`}
            aria-hidden={at !== i}
          >
            {phrase}
          </span>
        ))}
      </p>
    </div>
  );
}

const more = [
  "The multiplexer that you maybe already use. Keyboard-first but mouse-ready.",
  "Diff review with a comment flow built for agents. mdtation is hunk for markdown.",
  "Click a website element to tell your agent exactly which part of a page you mean. This inspired our flow.",
  "The terminal renderer we use, the same one OpenCode and hunk are built on.",
];

/** The chips as tabs: hover or click one and it stays open, with the longer line and its GitHub link in a slot that is always there. */
function Tabs({ radius, tone }: { radius: number; tone: number }) {
  const [at, setAt] = useState(-1);
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {friends.map(([Icon, name], i) => (
          <button
            key={name}
            type="button"
            aria-pressed={at === i}
            onClick={() => setAt(i)}
            onFocus={() => setAt(i)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setAt(i)}
            className={`inline-flex cursor-pointer items-center gap-2 px-3.5 py-2 font-mono text-[13px] transition-colors duration-200 ${at === i ? "text-foreground" : "text-foreground/60"}`}
            style={{ borderRadius: radius, background: fill(at === i ? tone * 2 : tone) }}
          >
            <Icon className="h-3.5 w-auto shrink-0" />
            {name}
          </button>
        ))}
      </div>
      <div
        className="mx-auto mt-5 grid h-24 max-w-[440px] text-center text-[13px] leading-relaxed text-muted-foreground sm:h-20"
        aria-live="polite"
      >
        {friends.map(([, name, , href], i) => (
          <div
            key={name}
            inert={at !== i}
            className={`col-start-1 row-start-1 transition-opacity duration-300 ${at === i ? "" : "opacity-0"}`}
          >
            <p className="text-balance">{more[i]}</p>
            <a
              href={href}
              {...out}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-foreground/60 transition-colors duration-200 hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <GitHub className="size-3.5" />
              GitHub
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One sentence, the four names in it as icon links. */
function Line() {
  const name = (i: number) => {
    const [Icon, label, , href] = friends[i];
    return (
      <a
        href={href}
        {...out}
        className="inline-flex items-baseline gap-1.5 font-mono text-[0.93em] whitespace-nowrap text-foreground/75 transition-colors duration-200 hover:text-foreground"
      >
        <Icon className="h-[0.95em] w-auto shrink-0 self-center" />
        {label}
      </a>
    );
  };
  return (
    <p className="mx-auto max-w-[520px] text-center text-[15px] leading-relaxed text-balance text-muted-foreground">
      Ideas from {name(0)}, {name(1)} and {name(2)}, drawn with {name(3)}.
    </p>
  );
}

/** The cards without borders: soft fills, small type, two lines at most. */
function Cards({ radius, tone }: { radius: number; tone: number }) {
  return (
    <div className="mx-auto grid max-w-[820px] grid-cols-2 gap-2 lg:grid-cols-4">
      {friends.map(([Icon, name, phrase, href]) => (
        <a
          key={name}
          href={href}
          {...out}
          className="group min-w-0 px-3.5 py-3 text-left transition-colors duration-200 hover:bg-foreground/[0.03]"
          style={{ borderRadius: Math.min(radius, 20), backgroundColor: fill(tone) }}
        >
          <span className="flex items-center gap-2 font-mono text-[13px] text-foreground/75 transition-colors duration-200 group-hover:text-foreground">
            <Icon className="h-3.5 w-auto shrink-0" />
            {name}
          </span>
          <span className="mt-1.5 line-clamp-2 h-[2.9em] text-[12px] leading-[1.45] text-muted-foreground">
            {phrase}
          </span>
        </a>
      ))}
    </div>
  );
}

/** Compact friends: the quote, and a light body under it. */
export function Kin({
  variant,
  width = 760,
  radius = 24,
  tone = 0.03,
}: { variant: (typeof kins)[number] } & Look) {
  return (
    <div className="mx-auto w-full" style={{ maxWidth: Math.max(width, 560) }}>
      <Quote link={variant === "quote"} />
      <div className="mt-12">
        {variant === "row" && <Chips radius={radius} tone={tone + 0.01} />}
        {variant === "tabs" && <Tabs radius={radius} tone={tone + 0.01} />}
        {variant === "line" && <Line />}
        {variant === "cards" && <Cards radius={radius} tone={tone} />}
        {variant === "quote" && (
          <p className="text-center text-[13px] text-muted-foreground">
            Drawn with{" "}
            <a
              href={friends[3][3]}
              {...out}
              className="inline-flex items-baseline gap-1.5 font-mono text-foreground/75 transition-colors duration-200 hover:text-foreground"
            >
              <OpenTUI className="h-[0.95em] w-auto self-center" />
              OpenTUI
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
