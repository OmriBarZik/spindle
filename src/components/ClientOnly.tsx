"use client";

import dynamic from "next/dynamic";

const Loading = () => <p className="p-8 text-center text-muted">Warming up the turntable…</p>;

export const SortGameClient = dynamic(() => import("@/components/SortGame"), {
  ssr: false,
  loading: Loading,
});

export const TimelineGameClient = dynamic(() => import("@/components/TimelineGame"), {
  ssr: false,
  loading: Loading,
});
