"use client";

// The homepage: the short page from /lab/page-5 with its picks locked in:
// story as scroll, stage as the open rail, tour as side, friends as tabs, closing as the panel.
// Both block titles are locked too; /lab/page-5 keeps every picker.

import { useState } from "react";
import { Block } from "./block";
import { Header } from "./header";
import { CardHero, tints } from "./hero";
import { Faq, Install, Pitch } from "./home";
import { Pebble } from "./lab/pebble";
import { Closing, Kin } from "./study/closing/closing";
import { Stage, Tour } from "./study/loop/stage";
import { Story } from "./study/story/story";

export default function Page() {
  const [look, setLook] = useState("");
  return (
    <div className="relative overflow-x-clip">
      <Header mark={<Pebble color={tints[look] ?? "transparent"} />} />
      <CardHero onLook={setLook}>
        <Pitch />
      </CardHero>
      <Install />
      <main className="mx-auto max-w-[880px] px-5 pt-8 sm:px-8">
        <Block>
          <Story variant="scroll" width={880} agents={false} />
        </Block>
        <Block id="stage" anchor="loop" title="1">
          <Stage variant="rail" take="open" />
        </Block>
        <Block>
          <Kin variant="tabs" width={880} />
        </Block>
        <Block id="tour" anchor="features" title="2">
          <Tour variant="side" />
        </Block>
        <div className="[&>section]:border-t-0">
          <Faq />
        </div>
      </main>
      <div className="px-5 pt-8 pb-16 sm:px-8">
        <Closing variant="panel" width={880} />
      </div>
    </div>
  );
}
