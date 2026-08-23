/** Renders `key` spans in copy as <code>. */
export function code(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 ? (
      <code key={i} className="rounded bg-muted px-1 font-mono text-[0.85em] text-foreground">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

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
  return (
    <figure className={`min-w-0 ${className}`}>
      <div className={`overflow-hidden border bg-[#1b1d1b] ${frame}`}>
        {still ? (
          <img src={`/media/${name}.png`} alt={caption?.replaceAll("`", "") ?? ""} className={`block w-full ${box}`} />
        ) : (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
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
