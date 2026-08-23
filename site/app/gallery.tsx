import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clip } from "./clip";
import { code } from "./code";
import { GIFS } from "./gifs";

/** Feature gallery: one tab per group, each feature a tight card with its clip on top. */
export function Gallery() {
  return (
    <Tabs defaultValue={GIFS[0].title}>
      <div className="overflow-x-auto pb-1">
        <TabsList>
          {GIFS.map((g) => (
            <TabsTrigger key={g.title} value={g.title} className="px-3">
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
