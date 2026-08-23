/** Terminal chrome with a title and free-form lines. Ported from openindex lib/terminal without the typing animation. */
export function Prompt({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card font-mono text-xs sm:text-[13px] leading-relaxed">
      <div className="flex items-center gap-1.5 border-b px-3 py-2">
        <i className="size-2.5 rounded-full bg-[#ff5f57]" />
        <i className="size-2.5 rounded-full bg-[#febc2e]" />
        <i className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="overflow-x-auto p-4 [&>*+*]:mt-2">{children}</div>
    </div>
  );
}
