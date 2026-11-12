"use client";

// The homepage: the short page from /lab/page-5, each block on the first variant of its picker.
// In dev a named picker under every block flips its variants in place; production renders the first.

import { useState } from "react";
import { Block } from "./block";
import { Header } from "./header";
import { CardHero, tints } from "./hero";
import { Faq, Install, Pitch } from "./home";
import { Pebble } from "./lab/pebble";
import { Picker, usePick } from "./pick";
import { Closing, Kin, closings, kins } from "./study/closing/closing";
import { Stage, Tour, stages, tours } from "./study/loop/stage";
import { Story, variants } from "./study/story/story";

export default function Page() {
  const [look, setLook] = useState("");
  const [story, setStory] = usePick("story", variants);
  const [stage, setStage] = usePick("stage", stages);
  const [tour, setTour] = usePick("tour", tours);
  const [kin, setKin] = usePick("friends", kins);
  const [closing, setClosing] = usePick("closing", closings);
  return (
    <div className="relative overflow-x-clip">
      <Header mark={<Pebble color={tints[look] ?? "transparent"} />} />
      <CardHero onLook={setLook}>
        <Pitch />
      </CardHero>
      <Install />
      <main className="mx-auto max-w-[880px] px-5 pt-8 sm:px-8">
        <Block>
          <Story variant={story} width={880} agents={false} />
          <Picker label="story" names={variants} at={story} set={setStory} className="mt-4" />
        </Block>
        <Block id="stage" anchor="loop">
          <Stage variant={stage} />
          <Picker label="stage" names={stages} at={stage} set={setStage} className="mt-4" />
        </Block>
        <Block id="tour" anchor="features">
          <Tour variant={tour} />
          <Picker label="tour" names={tours} at={tour} set={setTour} className="mt-4" />
        </Block>
        <Block>
          <Kin variant={kin} width={880} />
          <Picker label="friends" names={kins} at={kin} set={setKin} className="mt-4" />
        </Block>
        <div className="[&>section]:border-t-0">
          <Faq />
        </div>
      </main>
      <div className="px-5 pt-8 pb-16 sm:px-8">
        <Closing variant={closing} width={880} />
        <Picker label="closing" names={closings} at={closing} set={setClosing} className="mt-6" />
      </div>
    </div>
  );
}
