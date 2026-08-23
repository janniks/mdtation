import { Agents } from "../../agents";

/** README banner source, 2:1, two columns: copy left, keyline and terminal right. Screenshot `#banner` into `.github/media/banner.png`. */
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-8">
      <div
        id="banner"
        className="flex h-[800px] w-[1600px] shrink-0 items-center gap-16 overflow-hidden bg-[#fbfaf7] pl-24"
      >
        <div className="flex w-[560px] shrink-0 flex-col items-start text-left">
          <p className="flex items-center gap-4 text-3xl font-semibold tracking-tight text-[#2a2823]">
            <span className="inline-flex size-14 items-center justify-center rounded-xl border-2 bg-card text-3xl leading-none">
              <span className="[filter:grayscale(1)_contrast(0)_brightness(0.92)_sepia(0.25)]">
                🧘
              </span>
            </span>
            mdtation
          </p>
          <h1 className="mt-10 text-7xl font-semibold leading-[1.05] tracking-tight text-[#2a2823]">
            A better agentic feedback flow.
          </h1>
          <Agents className="mt-10 scale-110" label="works with" />
        </div>
        <div className="flex h-full min-w-0 flex-1 flex-col items-end pt-14">
          <p className="pr-10 font-mono text-xl text-muted-foreground">
            terminal markdown viewer for agent workflows
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/hero.png"
            alt=""
            className="mt-10 w-[900px] max-w-none rounded-tl-xl shadow-[0_24px_60px_-30px_rgba(0,0,0,0.45)]"
          />
        </div>
      </div>
    </div>
  );
}
