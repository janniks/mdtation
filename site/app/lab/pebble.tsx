/** Pass "transparent" while the tint is unknown and it fades in when the colour arrives.
 * The pebble mark from /study/logos/shapes' top bar: a soft sage stone, tilted. */
export function Pebble({ size = 15, color = "#708574" }: { size?: number; color?: string }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 -rotate-20 transition-colors duration-700"
      style={{ width: size, height: size * 1.2, borderRadius: "60% 45% 50% 35%", backgroundColor: color }}
    />
  );
}
