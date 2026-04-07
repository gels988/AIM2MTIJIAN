import type { LanguageCode } from "@/registry/system-config";

export type StandardDictionary = {
  actions: {
    deepInspect: string;
    subSystem: string;
    donate: string;
  };
  hints: {
    subSystemLocked: string;
  };
};

export const STANDARD_I18N: Record<LanguageCode, StandardDictionary> = {
  zh: {
    actions: {
      deepInspect: "🩺 深度自检",
      subSystem: "👥 子民系统",
      donate: "💖 赞助捐赠",
    },
    hints: {
      subSystemLocked: "需 90 积分解锁上帝视角",
    },
  },
  en: {
    actions: {
      deepInspect: "🩺 Deep Inspect",
      subSystem: "👥 Citizens",
      donate: "💖 Donate",
    },
    hints: {
      subSystemLocked: "God-view unlock requires 90 points",
    },
  },
  ja: {
    actions: {
      deepInspect: "🩺 深度自検",
      subSystem: "👥 子民システム",
      donate: "💖 寄付",
    },
    hints: {
      subSystemLocked: "神視点の解放には 90 ポイントが必要です",
    },
  },
  ko: {
    actions: {
      deepInspect: "🩺 심층 자가진단",
      subSystem: "👥 시민 시스템",
      donate: "💖 후원",
    },
    hints: {
      subSystemLocked: "90 포인트가 있어야 신 시야가 해제됩니다",
    },
  },
};
