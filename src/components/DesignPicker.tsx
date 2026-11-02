"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { chooseDesign, DESIGNS, useDesign } from "@/lib/design";

/** Switches between the placement layouts being tried out. */
export default function DesignPicker() {
  const { t } = useI18n();
  const current = useDesign();
  return (
    <section aria-label={t.design.label} className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap justify-center gap-1 rounded-full border border-line p-1">
        {DESIGNS.map((design) => (
          <button
            key={design}
            type="button"
            aria-pressed={design === current}
            onClick={() => {
              if (design !== current) chooseDesign(design);
            }}
            className={`rounded-full px-3 py-1 text-xs transition ${
              design === current
                ? "bg-white font-semibold text-black"
                : "text-muted hover:text-white"
            }`}
          >
            {t.design.names[design]}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">{t.design.hint}</p>
    </section>
  );
}
