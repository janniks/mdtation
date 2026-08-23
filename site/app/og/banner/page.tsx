import { Agents } from "../../agents";

/** README banner source, 2:1. Screenshot `#banner` into `.github/media/banner.png`. */
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-8">
      <div
        id="banner"
        className="flex h-[800px] w-[1600px] shrink-0 flex-col items-center overflow-hidden bg-[#fbfaf7] pt-20 text-center"
      >
        <p className="font-mono text-2xl text-muted-foreground">
          terminal markdown viewer for agent workflows
        </p>
        <h1 className="mt-6 text-8xl font-semibold tracking-tight text-[#2a2823]">
          A better agentic feedback flow.
        </h1>
        <Agents className="mt-10 scale-125 justify-center" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/hero.png"
          alt=""
          className="mt-14 w-[1150px] rounded-t-xl shadow-[0_24px_60px_-30px_rgba(0,0,0,0.45)]"
        />
      </div>
    </div>
  );
}
