import { Agents } from "../agents";

/** README banner source, 3:1, two columns: copy left inside registration marks, terminal with the comment popup open right, flush to the bottom edge. Screenshot `#banner` into `.github/media/banner.png`. */
export default function Page() {
  const mark = "absolute text-sm leading-none text-muted-foreground/60";
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-8">
      <div
        id="banner"
        className="flex h-[534px] w-[1602px] shrink-0 items-center gap-20 overflow-hidden bg-[#fbfaf7] pl-14"
      >
        <div className="relative flex w-[520px] shrink-0 flex-col items-start px-9 py-7 text-left">
          <span className={`${mark} top-0 left-0`} aria-hidden>
            +
          </span>
          <span className={`${mark} top-0 right-0`} aria-hidden>
            +
          </span>
          <span className={`${mark} bottom-0 left-0`} aria-hidden>
            +
          </span>
          <span className={`${mark} right-0 bottom-0`} aria-hidden>
            +
          </span>
          <p className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-[#2a2823]">
            <span className="inline-flex size-12 items-center justify-center rounded-xl border-2 bg-card text-2xl leading-none">
              <span className="[filter:grayscale(1)_contrast(0)_brightness(0.92)_sepia(0.25)]">
                🧘
              </span>
            </span>
            mdtation
          </p>
          <h1 className="mt-7 text-6xl font-semibold leading-[1.05] tracking-tight text-[#2a2823]">
            A better agentic feedback flow.
          </h1>
          <p className="mt-6 font-mono text-lg text-muted-foreground">
            terminal markdown viewer for agent workflows
          </p>
          <Agents className="mt-8 origin-left scale-110" label="works with" />
        </div>
        <div className="relative h-full min-w-0 flex-1">
          <div className="absolute top-8 right-10 w-[620px] overflow-hidden rounded-xl [corner-shape:squircle] bg-[#26262a] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_1px_rgba(0,0,0,0.35),0_0_0_3px_rgba(255,255,255,0.35),0_40px_80px_-24px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-1.5 border-b border-black/40 bg-[#3a3a3e] px-3 py-2.5">
              <i className="size-2.5 rounded-full bg-[#5a5a58]" />
              <i className="size-2.5 rounded-full bg-[#5a5a58]" />
              <i className="size-2.5 rounded-full bg-[#5a5a58]" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/backplan.png" alt="" className="block w-full" />
          </div>
          <div className="absolute bottom-0 left-0 z-10 w-[700px] translate-y-[25%] overflow-hidden rounded-t-xl [corner-shape:squircle] bg-[#26262a] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_0_0_1px_rgba(0,0,0,0.35),0_0_0_3px_rgba(255,255,255,0.35),0_24px_60px_-30px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-1.5 border-b border-black/40 bg-[#3a3a3e] px-3 py-2.5">
              <i className="size-2.5 rounded-full bg-[#ff5f57]" />
              <i className="size-2.5 rounded-full bg-[#febc2e]" />
              <i className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/popup.png" alt="" className="block w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
