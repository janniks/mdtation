import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clip, code } from "./clip";
import { GIFS } from "./gifs";

/** Feature gallery: one tab per group, each feature an alternating clip/text row on lg+, stacked below. */
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
          <ul className="mt-6 space-y-16 lg:space-y-20">
            {g.items.map(([name, title, body], i) => (
              <li
                key={name}
                className="grid items-center gap-6 lg:grid-cols-[11fr_9fr] lg:gap-12 [&>*]:min-w-0"
              >
                <Clip name={name} wide className={i % 2 ? "lg:order-2" : ""} />
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{code(body)}</p>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>
      ))}
    </Tabs>
  );
}
