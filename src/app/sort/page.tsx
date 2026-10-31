import type { Metadata } from "next";
import Header from "@/components/Header";
import { SortGameClient } from "@/components/ClientOnly";

export const metadata: Metadata = { title: "Daily Five · Spindle" };

export default function SortPage() {
  return (
    <>
      <Header title="Daily Five" />
      <SortGameClient />
    </>
  );
}
