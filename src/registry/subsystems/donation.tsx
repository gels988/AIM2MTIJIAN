"use client";

import type { DonationAddress } from "@/registry/system-config";

export function DonationModule({
  title = "Donation",
  addresses,
}: {
  title?: string;
  addresses: DonationAddress[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-semibold text-[#e5e7eb]">{title}</div>
      <div className="mt-3 space-y-2">
        {addresses.map((a) => (
          <div
            key={`${a.chain}:${a.address}`}
            className="rounded-xl border border-white/10 bg-black/25 px-4 py-3"
          >
            <div className="text-xs text-[#e5e7eb]/60">
              {a.label ? `${a.label} · ${a.chain}` : a.chain}
            </div>
            <div className="mt-1 break-all font-mono text-xs text-[#e5e7eb]/85">
              {a.address}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
