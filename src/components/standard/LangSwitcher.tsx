"use client";

import { Globe } from "lucide-react";

import type { LanguageCode, LanguageOption } from "@/registry/system-config";

export function LangSwitcher({
  value,
  onChange,
  options,
}: {
  value: LanguageCode;
  onChange: (next: LanguageCode) => void;
  options: LanguageOption[];
}) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 shadow-[0_0_0_1px_rgba(124,58,237,0.12)]">
      <Globe className="h-4 w-4 text-[#0ea5e9]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        className="h-10 bg-transparent text-sm text-[#e5e7eb] outline-none"
      >
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
