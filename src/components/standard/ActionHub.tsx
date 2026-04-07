"use client";

import { Heart, ShieldPlus, Users } from "lucide-react";

export function ActionHub({
  onDeepInspect,
  onSubSystem,
  onDonate,
  labels = {
    deepInspect: "🩺 深度自检",
    subSystem: "👥 子民系统",
    donate: "💖 赞助捐赠",
  },
}: {
  onDeepInspect?: () => void;
  onSubSystem?: () => void;
  onDonate?: () => void;
  labels?: {
    deepInspect: string;
    subSystem: string;
    donate: string;
  };
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onDeepInspect}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/5 px-4 text-sm font-semibold text-[#e5e7eb] shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
      >
        <ShieldPlus className="h-4 w-4 text-[#0ea5e9]" />
        {labels.deepInspect}
      </button>
      <button
        type="button"
        onClick={onSubSystem}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/5 px-4 text-sm font-semibold text-[#e5e7eb] shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
      >
        <Users className="h-4 w-4 text-[#fbbf24]" />
        {labels.subSystem}
      </button>
      <button
        type="button"
        onClick={onDonate}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/5 px-4 text-sm font-semibold text-[#e5e7eb] shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
      >
        <Heart className="h-4 w-4 text-[#7c3aed]" />
        {labels.donate}
      </button>
    </div>
  );
}
