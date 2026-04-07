"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error;
  }, [error]);

  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-dvh bg-[#0a0a0e] text-[#e5e7eb]">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6">
            <div className="text-sm font-semibold text-red-300">
              ⚠️ 系统监测到局部熵增（代码逻辑异常），已启动自我隔离与回滚。请点击
              [重试按钮] 或联系岛主。
            </div>
            <div className="mt-3 text-xs text-red-200/70">
              {error.digest ? `Digest: ${error.digest}` : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-red-500/15 px-5 text-sm font-semibold text-red-100 shadow-[0_0_0_1px_rgba(239,68,68,0.35)] transition hover:bg-red-500/20"
            >
              重试
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white/5 px-5 text-sm font-semibold text-[#e5e7eb] shadow-[0_0_0_1px_rgba(229,231,235,0.15)] transition hover:bg-white/10"
            >
              返回首页
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
