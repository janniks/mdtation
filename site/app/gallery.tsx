import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clip } from "./clip";
import { code } from "./code";
import { GIFS as ALL } from "./gifs";

/** Only Navigate and Comments for now. The other groups stay in gifs.ts until the demo needs them. */
const GIFS = ALL.slice(0, 2);

/** Tab strip styles under comparison: shadcn default, shadcn line, or the site's mono tag look. */
const STYLES = {
  default: ["", "px-3"],
  line: ["", "px-3"],
  mono: [
    "gap-1 bg-transparent p-0",
    "rounded-md border border-transparent px-3 font-mono text-xs text-muted-foreground data-active:border-border data-active:bg-card data-active:shadow-none",
  ],
} as const;

/** Feature gallery: one tab per group, each feature a tight card with its clip on top. */
export function Gallery({ variant = "default" }: { variant?: keyof typeof STYLES }) {
  const [list, item] = STYLES[variant];
  return (
    <Tabs defaultValue={GIFS[0].title}>
      <div className="flex justify-center overflow-x-auto pb-1">
        <TabsList variant={variant === "line" ? "line" : "default"} className={list}>
          {GIFS.map((g) => (
            <TabsTrigger key={g.title} value={g.title} className={item}>
              {g.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {GIFS.map((g) => (
        <TabsContent key={g.title} value={g.title}>
          <ul className="mt-4 grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
            {g.items.map(([name, title, body]) => (
              <li key={title}>
                <Card className="h-full gap-2 py-3 [--card-spacing:0.75rem]">
                  <CardContent className="space-y-2">
                    <Clip name={name} wide />
                    <h3 className="pt-1 font-semibold tracking-tight">{title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{code(body)}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </TabsContent>
      ))}
    </Tabs>
  );
}
