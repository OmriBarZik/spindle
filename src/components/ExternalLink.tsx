"use client";

import type { ComponentProps } from "react";
import { useI18n } from "@/i18n/I18nProvider";

/** A link that opens in a new tab, and says so to screen readers. */
export default function ExternalLink({
  children,
  ...props
}: Omit<ComponentProps<"a">, "target" | "rel"> & { href: string }) {
  const { t } = useI18n();
  return (
    <a {...props} target="_blank" rel="noreferrer">
      {children}
      <span className="sr-only"> {t.common.newTab}</span>
    </a>
  );
}
