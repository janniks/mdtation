import { Card } from "./card";

/** Live DOM copy of the social card for review. The PNG comes from /opengraph-image. */
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-8">
      <div className="h-[630px] w-[1200px] shrink-0 overflow-hidden rounded-lg shadow-lg">
        <Card sans="var(--font-sans)" mono="var(--font-mono)" logo="/icon.png" />
      </div>
    </div>
  );
}
