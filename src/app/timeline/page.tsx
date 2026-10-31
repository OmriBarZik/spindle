import type { Metadata } from "next";
import Header from "@/components/Header";
import { TimelineGameClient } from "@/components/ClientOnly";

export const metadata: Metadata = { title: "Daily Timeline · Spindle" };

export default function TimelinePage() {
  return (
    <>
      <Header title="Daily Timeline" />
      <TimelineGameClient />
    </>
  );
}
