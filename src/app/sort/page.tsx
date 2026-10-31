import type { Metadata } from "next";
import Header from "@/components/Header";
import { SortGameClient } from "@/components/ClientOnly";

export const metadata: Metadata = { title: "Daily Sort · Spindle" };

export default function SortPage() {
  return (
    <>
      <Header title="Daily Sort" />
      <SortGameClient />
    </>
  );
}
