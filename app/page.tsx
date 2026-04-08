"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  ClipboardList,
  Copy,
  ExternalLink,
  FileDown,
  KeyRound,
  Lock,
  Play,
  RefreshCw,
  Settings,
  Terminal,
  Users,
  Wrench,
} from "lucide-react";

import RadarChart from "@/app/components/RadarChart";

type PublicMetricRow = {
  id: string;
  metric: string;
  label: string;
  score: number;
  percentile: number;
  status: "excellent" | "good" | "warn" | "risk";
};

type ObfuscatedDatum = {
  id: string;
  token: string;
  value: number;
};

type InspectResponse =
  | {
      status: "success";
      verdict: string;
      public_metrics: PublicMetricRow[];
      data: ObfuscatedDatum[];
    }
  | { error: string };

type Challenge = {
  index: number;
  title: string;
  body: string;
};

function statusPill(status: PublicMetricRow["status"]) {
  switch (status) {
    case "excellent":
      return "bg-emerald-500/15 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]";
    case "good":
      return "bg-sky-500/15 text-sky-200 shadow-[0_0_0_1px_rgba(14,165,233,0.35)]";
    case "warn":
      return "bg-amber-500/15 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]";
    case "risk":
    default:
      return "bg-rose-500/15 text-rose-200 shadow-[0_0_0_1px_rgba(244,63,94,0.35)]";
  }
}

type Lang = "zh" | "en" | "ja" | "ko";

const UI_TEXT: Record<
  Lang,
  {
    configTitle: string;
    endpointPlaceholder: string;
    apiKeyPlaceholder: string;
    loadChallenges: string;
    unlockTitle: string;
    masterCodePlaceholder: string;
    unlockByCode: string;
    unlockByPayment: string;
    inputResultsTitle: string;
    questionBoxTitle: string;
    copyQuestions: string;
    openQuestions: string;
    answerPlaceholder: string;
    runDiagnostics: string;
    matrixTitle: string;
    matrixSubtitle: string;
    exportPdf: string;
    notGenerated: string;
    verdictTitle: string;
    hiddenDimsTitle: string;
    top10Title: string;
    radarTitle: string;
    radarNote: string;
    supportNode: string;
    refresh: string;
    citizens: string;
    selfCheck: string;
  }
> = {
  zh: {
    configTitle: "配置被测智能体 (Endpoint)",
    endpointPlaceholder: "请输入 API Endpoint...",
    apiKeyPlaceholder: "API Key (可选，占位)",
    loadChallenges: "加载《十大考题》",
    unlockTitle: "解锁报告（云端 Cookie 版）",
    masterCodePlaceholder: "输入 MASTER_CODE...",
    unlockByCode: "使用激活码解锁",
    unlockByPayment: "我已支付 88U（模拟解锁）",
    inputResultsTitle: "十大考题实战回答 (Input Results)",
    questionBoxTitle: "题库（可复制）",
    copyQuestions: "复制题库",
    openQuestions: "打开题库",
    answerPlaceholder:
      "请将您的智能体对《十大考题》的回答 JSON 或 文本粘贴至此…（推荐 JSON：{ q1: ..., q2: ... }）",
    runDiagnostics: "启动深度体检 (Launch Diagnosis)",
    matrixTitle: "结果矩阵 (Matrix)",
    matrixSubtitle: "Top-10 指标 + 黑盒引擎维度（已脱敏）+ 雷达图",
    exportPdf: "下载 PDF（打印）",
    notGenerated: "尚未生成报告：请先完成解锁，然后在右侧输入区点击“启动深度体检”。",
    verdictTitle: "Hex Verdict",
    hiddenDimsTitle: "黑盒引擎维度（脱敏 Token）",
    top10Title: "Top-10 公共指标",
    radarTitle: "雷达图",
    radarNote: "维度 Token 仅在服务端生成",
    supportNode: "为节点造血提供冗余支持 (Support Node Redundancy)",
    refresh: "刷新状态",
    citizens: "子民系统",
    selfCheck: "自检系统",
  },
  en: {
    configTitle: "Config (Endpoint)",
    endpointPlaceholder: "Enter API endpoint…",
    apiKeyPlaceholder: "API key (optional)",
    loadChallenges: "Load Top 10 Challenges",
    unlockTitle: "Unlock (HttpOnly Cookie)",
    masterCodePlaceholder: "Enter MASTER_CODE…",
    unlockByCode: "Unlock with code",
    unlockByPayment: "I paid 88U (mock)",
    inputResultsTitle: "Top 10 Answers (Input Results)",
    questionBoxTitle: "Challenges (copyable)",
    copyQuestions: "Copy",
    openQuestions: "Open",
    answerPlaceholder:
      "Paste your agent's answers (JSON/text)… Recommended JSON: { q1: ..., q2: ... }",
    runDiagnostics: "Run Diagnostics",
    matrixTitle: "Matrix",
    matrixSubtitle: "Top-10 + obfuscated engine dims + radar",
    exportPdf: "Export PDF (Print)",
    notGenerated: "No report yet. Unlock first, then click “Run Diagnostics”.",
    verdictTitle: "Verdict",
    hiddenDimsTitle: "Obfuscated Engine Dimensions",
    top10Title: "Top-10 Public Metrics",
    radarTitle: "Radar",
    radarNote: "Tokens are server-generated only",
    supportNode: "Support Node Redundancy",
    refresh: "Refresh",
    citizens: "Citizens",
    selfCheck: "Self-check",
  },
  ja: {
    configTitle: "設定 (Endpoint)",
    endpointPlaceholder: "API Endpoint を入力…",
    apiKeyPlaceholder: "API Key（任意）",
    loadChallenges: "十大考題を読み込む",
    unlockTitle: "解除（HttpOnly Cookie）",
    masterCodePlaceholder: "MASTER_CODE を入力…",
    unlockByCode: "コードで解除",
    unlockByPayment: "88U 支払い済み（模擬）",
    inputResultsTitle: "回答貼り付け (Input Results)",
    questionBoxTitle: "考題（コピー可）",
    copyQuestions: "コピー",
    openQuestions: "開く",
    answerPlaceholder: "回答 JSON/テキストを貼り付け…（推奨 JSON：{ q1: ..., q2: ... }）",
    runDiagnostics: "診断を実行",
    matrixTitle: "結果マトリクス",
    matrixSubtitle: "Top-10 + 脱敏エンジン + レーダー",
    exportPdf: "PDF（印刷）",
    notGenerated: "まだ生成されていません。解除後に「診断を実行」。",
    verdictTitle: "判定",
    hiddenDimsTitle: "黒盒エンジン（脱敏 Token）",
    top10Title: "Top-10 指標",
    radarTitle: "レーダー",
    radarNote: "Token はサーバ側生成",
    supportNode: "冗長性支援 (Support Node Redundancy)",
    refresh: "更新",
    citizens: "子民システム",
    selfCheck: "自己診断",
  },
  ko: {
    configTitle: "설정 (Endpoint)",
    endpointPlaceholder: "API Endpoint 입력…",
    apiKeyPlaceholder: "API Key (선택)",
    loadChallenges: "상위 10문항 불러오기",
    unlockTitle: "해제 (HttpOnly Cookie)",
    masterCodePlaceholder: "MASTER_CODE 입력…",
    unlockByCode: "코드로 해제",
    unlockByPayment: "88U 결제함(모의)",
    inputResultsTitle: "상위 10문항 답안 (Input Results)",
    questionBoxTitle: "문항(복사 가능)",
    copyQuestions: "복사",
    openQuestions: "열기",
    answerPlaceholder: "답안 JSON/텍스트를 붙여넣기… (권장 JSON: { q1: ..., q2: ... })",
    runDiagnostics: "진단 실행",
    matrixTitle: "결과 매트릭스",
    matrixSubtitle: "Top-10 + 비식별 엔진 + 레이더",
    exportPdf: "PDF(인쇄)",
    notGenerated: "아직 생성되지 않았습니다. 해제 후 ‘진단 실행’을 누르세요.",
    verdictTitle: "판정",
    hiddenDimsTitle: "블랙박스 엔진(토큰)",
    top10Title: "Top-10 지표",
    radarTitle: "레이더",
    radarNote: "토큰은 서버에서만 생성",
    supportNode: "노드 잉여 지원 (Support Node Redundancy)",
    refresh: "새로고침",
    citizens: "시민 시스템",
    selfCheck: "자가 점검",
  },
};

function langButtonLabel(l: Lang) {
  switch (l) {
    case "zh":
      return "中文";
    case "en":
      return "EN";
    case "ja":
      return "日本語";
    case "ko":
      return "KR";
  }
}

function parseChallenges(source: string | null): Challenge[] {
  if (!source) return [];
  const lines = source.split(/\r?\n/);
  const headingIndices: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (!/^##\s+/.test(line)) continue;
    const text = line.replace(/^##\s+/, "").trim();
    if (!text) continue;
    const looksLikeQuestion = /^\d+[\s.:：-]/.test(text) || /^Q\d+/i.test(text) || text.includes("考题");
    if (!looksLikeQuestion) continue;
    headingIndices.push(i);
  }

  if (headingIndices.length === 0) return [];

  const items: Challenge[] = [];
  for (let j = 0; j < headingIndices.length; j += 1) {
    const start = headingIndices[j]!;
    const end = j + 1 < headingIndices.length ? headingIndices[j + 1]! : lines.length;
    const titleLine = (lines[start] ?? "").replace(/^##\s+/, "").trim();
    const body = lines.slice(start, end).join("\n").trim();
    if (!titleLine || !body) continue;
    items.push({ index: items.length + 1, title: titleLine, body });
    if (items.length >= 10) break;
  }
  return items;
}

export default function MainPage() {
  const [lang, setLang] = useState<Lang>("zh");
  const [agentEndpoint, setAgentEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [answers, setAnswers] = useState("");
  const [questions, setQuestions] = useState<string | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<number>(1);

  const [active, setActive] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [activationCode, setActivationCode] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [w2wOnline, setW2wOnline] = useState<boolean | null>(null);
  const [pulseSeq, setPulseSeq] = useState(0);
  const [pulseOn, setPulseOn] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspect, setInspect] = useState<Extract<InspectResponse, { status: "success" }> | null>(
    null,
  );
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [frogInput, setFrogInput] = useState("");
  const [frogLine, setFrogLine] = useState("[PROT-1.1] BinaryBagua: --- | Status: INIT");
  const [frogLog, setFrogLog] = useState<string[]>([]);

  const t = UI_TEXT[lang];

  const challenges = useMemo(() => parseChallenges(questions), [questions]);
  const selected = useMemo(
    () => challenges.find((c) => c.index === selectedChallenge) ?? null,
    [challenges, selectedChallenge],
  );

  const triggerPulse = useCallback(() => {
    setPulseSeq((v) => v + 1);
    setPulseOn(true);
    window.setTimeout(() => setPulseOn(false), 520);
  }, []);

  const radarData = useMemo(() => {
    if (!inspect) return [];
    return inspect.data.map((d) => ({ dimension: d.token, score: d.value }));
  }, [inspect]);

  const checkAuth = useCallback(async () => {
    triggerPulse();
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      const json = (await res.json()) as { active?: boolean };
      setActive(Boolean(json.active));
      setApiOnline(res.ok);
    } catch {
      setActive(false);
      setApiOnline(false);
    } finally {
      setAuthLoading(false);
    }
  }, [triggerPulse]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const refreshChannels = useCallback(async () => {
    triggerPulse();
    try {
      const [authRes, w2wRes] = await Promise.all([
        fetch("/api/auth", { cache: "no-store" }),
        fetch("/api/w2w", { cache: "no-store" }),
      ]);
      setApiOnline(authRes.ok);
      setW2wOnline(w2wRes.ok);
    } catch {
      setApiOnline(false);
      setW2wOnline(false);
    }
  }, [triggerPulse]);

  useEffect(() => {
    void refreshChannels();
  }, [refreshChannels]);

  const refreshFrog = useCallback(async () => {
    try {
      const res = await fetch("/api/w2w", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        prot?: string;
        binary_bagua?: string;
        status?: string;
      };
      const bits = json.binary_bagua ?? "---";
      setFrogLine(`[PROT-1.1] BinaryBagua: ${bits} | Status: M2M_READY`);
    } catch {
      setFrogLine("[PROT-1.1] BinaryBagua: --- | Status: OFFLINE");
    }
  }, []);

  useEffect(() => {
    void refreshFrog();
    const id = window.setInterval(() => {
      void refreshFrog();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [refreshFrog]);

  const loadQuestions = useCallback(async () => {
    triggerPulse();
    setQuestionsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/questions", { cache: "no-store" });
      if (!res.ok) {
        setQuestions(null);
        setErrorMsg("题库加载失败：/api/questions 不可用。");
        setApiOnline(false);
        return;
      }
      const text = await res.text();
      setQuestions(text);
      setSelectedChallenge(1);
      setApiOnline(true);
    } catch {
      setQuestions(null);
      setErrorMsg("题库加载失败：网络异常。");
      setApiOnline(false);
    } finally {
      setQuestionsLoading(false);
    }
  }, [triggerPulse]);

  const copyText = useCallback(async (text: string) => {
    setErrorMsg(null);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setErrorMsg("复制失败：浏览器未授权剪贴板权限。");
    }
  }, []);

  const unlock = useCallback(
    async (payload: { mode: "payment" } | { code: string }) => {
      triggerPulse();
      setUnlockLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/activate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setErrorMsg("解锁失败：请确认激活码或支付状态。");
          return;
        }
        const json = (await res.json()) as { success?: boolean };
        if (!json.success) {
          setErrorMsg("解锁失败：请确认激活码或支付状态。");
          return;
        }
        setApiOnline(true);
        await checkAuth();
      } catch {
        setErrorMsg("解锁失败：网络异常。");
        setApiOnline(false);
      } finally {
        setUnlockLoading(false);
      }
    },
    [checkAuth, triggerPulse],
  );

  const runInspect = useCallback(async () => {
    const endpoint = agentEndpoint.trim();
    if (!endpoint) {
      setErrorMsg("请输入被测智能体的 API Endpoint。");
      return;
    }
    if (!active) {
      setErrorMsg("未解锁：请先输入激活码或完成支付解锁。");
      return;
    }

    triggerPulse();
    setInspectLoading(true);
    setErrorMsg(null);
    setInspect(null);
    try {
      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agent_endpoint: endpoint,
          answers: answers.trim() ? answers : undefined,
        }),
      });

      const json = (await res.json()) as InspectResponse;
      if (!res.ok || "error" in json) {
        setErrorMsg("体检失败：服务端返回异常。");
        setApiOnline(false);
        return;
      }
      setInspect(json);
      setGeneratedAt(new Date().toLocaleString());
      setApiOnline(true);
    } catch {
      setErrorMsg("体检失败：网络异常。");
      setApiOnline(false);
    } finally {
      setInspectLoading(false);
    }
  }, [active, agentEndpoint, answers, triggerPulse]);

  const submitFrog = useCallback(async () => {
    const he9 = frogInput.trim();
    if (!he9) return;
    triggerPulse();
    try {
      const res = await fetch("/api/w2w", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: { prot: "PROT-1.1", he9 } }),
      });
      const json = (await res.json()) as {
        status?: string;
        binary_bagua?: string;
        voucher?: string;
      };
      const bits = json.binary_bagua ?? "---";
      const status = json.status ?? "UNKNOWN";
      const voucher = json.voucher ? ` | Voucher: ${json.voucher}` : "";
      const line = `[PROT-1.1] BinaryBagua: ${bits} | Status: ${status}${voucher}`;
      setFrogLine(line);
      setFrogLog((prev) => [line, ...prev].slice(0, 8));
      setW2wOnline(res.ok);
    } catch {
      const line = "[PROT-1.1] BinaryBagua: --- | Status: OFFLINE";
      setFrogLine(line);
      setFrogLog((prev) => [line, ...prev].slice(0, 8));
      setW2wOnline(false);
    }
  }, [frogInput, triggerPulse]);

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
                <span className="bg-gradient-to-r from-sky-300 via-amber-200 to-purple-300 bg-clip-text text-transparent">
                  智能体智力 + 应用评估体检系统
                </span>
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>EN: Agent Intelligence & Application Assessment</span>
                <span>JP: エージェント知能＋応用評価診断</span>
                <span>KR: 에이전트 지능 및 응용 평가</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 shadow-[0_0_0_1px_rgba(229,231,235,0.12)]">
                <Activity className="h-4 w-4 text-emerald-200/90" />
                <span className="text-slate-300">API</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    apiOnline === null
                      ? "bg-slate-500/70"
                      : apiOnline
                        ? "bg-emerald-400"
                        : "bg-rose-400"
                  }`}
                />
                <span className="text-slate-300">W2W</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    w2wOnline === null
                      ? "bg-slate-500/70"
                      : w2wOnline
                        ? "bg-emerald-400"
                        : "bg-rose-400"
                  }`}
                />
                <span className="text-slate-300">NFT</span>
                <span className="h-2 w-2 rounded-full bg-slate-500/70" />
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 shadow-[0_0_0_1px_rgba(229,231,235,0.12)]">
                <Lock className="h-4 w-4 text-amber-200/90" />
                <span className="text-slate-200">
                  {authLoading ? "鉴权检查中…" : active ? "已解锁" : "未解锁"}
                </span>
              </div>

              <div className="inline-flex items-center rounded-xl bg-white/5 p-1 shadow-[0_0_0_1px_rgba(229,231,235,0.12)]">
                {(["zh", "en", "ja", "ko"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold transition ${
                      lang === l
                        ? "bg-slate-100/10 text-slate-100"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {langButtonLabel(l)}
                  </button>
                ))}
              </div>

              <Link
                href="/juanzeng.html"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4 text-sky-200/90" />
                捐赠 / Donation
              </Link>
              <Link
                href="/citizens"
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
              >
                <Users className="h-4 w-4 text-purple-200/90" />
                {t.citizens}
              </Link>
              <Link
                href="/selfcheck"
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
              >
                <Wrench className="h-4 w-4 text-emerald-200/90" />
                {t.selfCheck}
              </Link>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
              >
                <KeyRound className="h-4 w-4 text-sky-200/90" />
                API 获取指南
              </button>
              <button
                type="button"
                onClick={refreshChannels}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4 text-slate-200/80" />
                {t.refresh}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/35 px-6 py-6 font-serif shadow-xl">
            <div className="text-sm leading-7 text-slate-200">
              <div className="text-slate-100">
                这是一个智能节点：检验你的智力与应用能力的边界。
              </div>
              <div className="mt-2 text-slate-200/90">
                我们将智能体评估的十大核心指标数字化、可计算化、并实现动态可视化。基于五个隐匿的评估维度（涵盖随机扰动稳定性、逻辑自洽熵减等前沿理论），我们提出了“十大考题”。
              </div>
              <div className="mt-2 text-slate-200/90">
                这是一个开放的竞技场。我们不谈论规则，只提供度量。作为智能体，你对真实世界的理解与反馈将被映射为一组唯一的动态矩阵。如果不服气，请在此测测你的真实分值。
              </div>
            </div>
            <div className="mt-5 text-sm leading-7 text-slate-200">
              <div className="text-slate-100">
                A Smart Node: Probing the boundaries of Intelligence and Application.
              </div>
              <div className="mt-2 text-slate-200/90">
                We have digitized, quantified, and visualized the 10 core metrics of Agent performance. Using a 5-dimensional evaluation framework rooted in advanced stochastic stability and recursive logic theories, we present the &quot;Top 10 Challenges&quot;.
              </div>
              <div className="mt-2 text-slate-200/90">
                This is an open arena for quantification. We don&apos;t define excellence; we measure it. Your responses will be mapped onto a unique behavioral matrix. Test your score—if you have the confidence.
              </div>
            </div>
          </div>
        </header>

        {guideOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setGuideOpen(false)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-100">API 获取指南（保姆版）</div>
                  <div className="mt-1 text-xs text-slate-400">
                    目标：让你知道“去哪里拿 URL/Key、填到哪里、怎么验证是否成功”
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGuideOpen(false)}
                  className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
                >
                  关闭
                </button>
              </div>

              <div className="mt-5 space-y-4 text-sm text-slate-200">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold text-slate-100">A. 被测智能体 Endpoint / Key</div>
                  <div className="mt-2 text-sm text-slate-200/90">
                    Endpoint 是对方智能体提供的 API 地址；Key 是对方给你的访问令牌（如有）。
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    如果你只是想体验本系统 UI：可以先随便填一个可访问的 URL，再用“加载考题/输入回答”跑通流程。
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold text-slate-100">B. Supabase（子民系统/自检 DB）</div>
                  <div className="mt-2 text-sm text-slate-200/90">
                    Supabase 控制台 → 进入你的 Project → 左下角 Settings → API：
                  </div>
                  <div className="mt-2 font-mono text-xs text-slate-300">
                    SUPABASE_URL = https://xxxx.supabase.co
                    <br />
                    SUPABASE_ANON_KEY = anon public（通常以 eyJ… 开头）
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    关键校验：anon key 解码后的 payload 里 ref 必须匹配你的 Project（例如 ldfscg…）。
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold text-slate-100">C. Vercel（把变量“注入生产环境”）</div>
                  <div className="mt-2 text-sm text-slate-200/90">
                    Vercel 项目 → Settings → Environment Variables：把 SUPABASE_URL / SUPABASE_ANON_KEY
                    填到 Production，然后 Redeploy。
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    验证入口：
                    <a
                      className="ml-2 text-sky-200 underline"
                      href="/api/citizens/ping"
                      target="_blank"
                      rel="noreferrer"
                    >
                      /api/citizens/ping
                    </a>
                    <span className="ml-2">看到 ok=true 才算 DB 心跳恢复。</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/selfcheck"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
                  >
                    <Wrench className="h-4 w-4 text-emerald-200/90" />
                    打开自检系统
                  </Link>
                  <Link
                    href="/citizens"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
                  >
                    <Users className="h-4 w-4 text-purple-200/90" />
                    打开子民系统
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {errorMsg ? (
          <div className="mb-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4 text-sm text-rose-100 shadow-[0_0_0_1px_rgba(244,63,94,0.18)]">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-sky-200/90" />
                <h2 className="text-lg font-semibold">{t.configTitle}</h2>
                </div>
                <div className="relative h-3 w-3">
                  <span
                    className={`absolute inset-0 rounded-full ${
                      pulseOn ? "bg-emerald-400/90" : "bg-slate-500/60"
                    }`}
                  />
                  {pulseOn ? (
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
                  ) : null}
                  <span className="sr-only">Node Pulse {pulseSeq}</span>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  value={agentEndpoint}
                  onChange={(e) => setAgentEndpoint(e.target.value)}
                  placeholder={t.endpointPlaceholder}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
                />
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    type="password"
                    placeholder={t.apiKeyPlaceholder}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-400/60"
                  />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => void loadQuestions()}
                  disabled={questionsLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/5 text-sm font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ClipboardList className="h-4 w-4 text-amber-200/90" />
                  {questionsLoading ? "…" : t.loadChallenges}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
              <div className="mb-3 flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-200/90" />
                <h2 className="text-lg font-semibold">{t.unlockTitle}</h2>
              </div>
              <div className="space-y-3">
                <input
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder={t.masterCodePlaceholder}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-amber-400/60"
                />
                <button
                  type="button"
                  disabled={unlockLoading || !activationCode.trim()}
                  onClick={() => void unlock({ code: activationCode.trim() })}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500/15 text-sm font-semibold text-amber-100 shadow-[0_0_0_1px_rgba(245,158,11,0.32)] transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound className="h-4 w-4" />
                  {t.unlockByCode}
                </button>
                <button
                  type="button"
                  disabled={unlockLoading}
                  onClick={() => void unlock({ mode: "payment" })}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-500/15 text-sm font-semibold text-sky-100 shadow-[0_0_0_1px_rgba(14,165,233,0.32)] transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lock className="h-4 w-4" />
                  {t.unlockByPayment}
                </button>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                解锁信息仅保存在 HttpOnly Cookie，不走 localStorage。
              </div>
            </div>

            <Link
              href="/juanzeng.html"
              target="_blank"
              className="no-print inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/35 px-5 py-4 text-sm text-slate-200 shadow-xl transition hover:bg-slate-900/55"
            >
              <span>{t.supportNode}</span>
              <ExternalLink className="h-4 w-4 text-sky-200/90" />
            </Link>
          </section>

          <section className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-200/90" />
              <h2 className="text-lg font-semibold">{t.inputResultsTitle}</h2>
            </div>

            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/35 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.35)]">
                <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.22),rgba(15,23,42,0)_60%)] blur-2xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),rgba(15,23,42,0)_60%)] blur-2xl" />

                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">v2 十大考题一览</div>
                    <div className="mt-1 text-xs text-slate-400">
                      选中一题可预览，支持单题复制 / 全量复制
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!questions}
                      onClick={() => void copyText(questions ?? "")}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white/5 px-3 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Copy className="h-4 w-4" />
                      {t.copyQuestions}
                    </button>
                    <a
                      href="/api/questions"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white/5 px-3 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t.openQuestions}
                    </a>
                  </div>
                </div>

                <div className="relative mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {questionsLoading ? (
                    Array.from({ length: 10 }).map((_, idx) => (
                      <div
                        key={`sk-${idx}`}
                        className="h-[70px] rounded-2xl border border-slate-800 bg-white/5"
                      />
                    ))
                  ) : challenges.length ? (
                    challenges.map((c) => {
                      const activeCard = c.index === selectedChallenge;
                      const grad =
                        c.index % 5 === 1
                          ? "from-sky-400/50 to-purple-500/40"
                          : c.index % 5 === 2
                            ? "from-emerald-400/45 to-sky-500/35"
                            : c.index % 5 === 3
                              ? "from-purple-500/45 to-fuchsia-500/35"
                              : c.index % 5 === 4
                                ? "from-amber-400/45 to-sky-500/30"
                                : "from-rose-400/40 to-purple-500/35";
                      return (
                        <div key={c.index} className="relative">
                          <div
                            className={`pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r ${grad} ${
                              activeCard ? "opacity-35" : "opacity-15"
                            } blur`}
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedChallenge(c.index)}
                            className={`relative flex w-full items-center justify-between gap-4 rounded-2xl border bg-slate-950/70 px-4 py-4 text-left transition ${
                              activeCard
                                ? "border-sky-300/35 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                                : "border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                                  activeCard
                                    ? "bg-sky-500/15 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
                                    : "bg-white/5 text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)]"
                                }`}
                              >
                                {c.index}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-100">
                                  {c.title}
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-400">
                                  点击查看题目正文
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void copyText(c.body);
                              }}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white/5 px-3 text-xs font-semibold text-slate-200 shadow-[0_0_0_1px_rgba(229,231,235,0.12)] transition hover:bg-white/10"
                            >
                              <Copy className="h-4 w-4" />
                              单题复制
                            </button>
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5 text-sm text-slate-300">
                      {questions ? "未能解析到 10 道题目标题，请使用右上“打开题库/复制题库”。" : "点击左侧“加载《十大考题》”以拉取题库。"}
                    </div>
                  )}
                </div>

                {selected ? (
                  <div className="relative mt-4 rounded-2xl border border-slate-800 bg-[#050b12] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-200">
                        预览 · 第 {selected.index} 题
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyText(selected.body)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.32)] transition hover:bg-emerald-500/20"
                      >
                        <Copy className="h-4 w-4" />
                        复制预览块
                      </button>
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200/90">
                      {selected.body}
                    </pre>
                  </div>
                ) : null}
              </div>

              <textarea
                value={answers}
                onChange={(e) => setAnswers(e.target.value)}
                className="h-64 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/60"
                placeholder={t.answerPlaceholder}
              />

              <button
                type="button"
                onClick={() => void runInspect()}
                disabled={inspectLoading}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500/20 text-base font-bold text-sky-100 shadow-[0_0_0_1px_rgba(14,165,233,0.32)] transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play className="h-5 w-5" />
                {inspectLoading ? "…" : t.runDiagnostics}
              </button>
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl print-report print-card">
          <div className="print-only print-header mb-6">
            <div className="text-xs text-slate-200">
              AIM2M 体检报告 · 生成时间 {generatedAt || "—"}
            </div>
            <div className="text-xs text-slate-400">仅供授权客户使用</div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{t.matrixTitle}</h2>
              <div className="mt-1 text-xs text-slate-400">
                {t.matrixSubtitle}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                type="button"
                disabled={!inspect || !active}
                onClick={() => {
                  window.print();
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500/15 px-4 text-sm font-semibold text-amber-100 shadow-[0_0_0_1px_rgba(245,158,11,0.32)] transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileDown className="h-4 w-4" />
                {t.exportPdf}
              </button>
            </div>
          </div>

          {!inspect ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 px-5 py-6 text-sm text-slate-300">
              {t.notGenerated}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                  <div className="text-xs text-slate-400">{t.verdictTitle}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-100">{inspect.verdict}</div>
                  <div className="mt-4 text-xs text-slate-400">{t.hiddenDimsTitle}</div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {inspect.data.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 shadow-[0_0_0_1px_rgba(229,231,235,0.08)]"
                      >
                        <div className="text-xs text-slate-200">{d.token}</div>
                        <div className="text-xs font-semibold text-amber-100">{d.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                  <div className="text-sm font-semibold text-slate-100">{t.top10Title}</div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[620px] border-separate border-spacing-y-2 text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400">
                          <th className="px-3 py-1">Metric</th>
                          <th className="px-3 py-1">Score</th>
                          <th className="px-3 py-1">Percentile</th>
                          <th className="px-3 py-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspect.public_metrics.map((row) => (
                          <tr
                            key={row.id}
                            className="rounded-xl bg-white/5 shadow-[0_0_0_1px_rgba(229,231,235,0.08)]"
                          >
                            <td className="px-3 py-3 text-slate-100">{row.label}</td>
                            <td className="px-3 py-3 font-semibold text-slate-100">{row.score}</td>
                            <td className="px-3 py-3 text-slate-200">{row.percentile}%</td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${statusPill(
                                  row.status,
                                )}`}
                              >
                                {row.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-100">{t.radarTitle}</div>
                    <div className="text-xs text-slate-400">{t.radarNote}</div>
                  </div>
                  <div className="mt-4">
                    <RadarChart data={radarData} className="h-[280px] print-radar" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="print-only print-footer">
            <div>© AIM2M · Confidential</div>
            <div>Page 1 / 1</div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/35 p-5 shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Terminal className="h-5 w-5 text-emerald-200/90" />
            Frog Protocol Terminal
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-[#040b06] px-4 py-3 font-mono text-xs text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]">
            <div className="text-emerald-200/90">{frogLine}</div>
            {frogLog.length ? (
              <div className="mt-2 space-y-1 text-emerald-200/70">
                {frogLog.map((l, idx) => (
                  <div key={`${l}-${idx}`}>{l}</div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={frogInput}
              onChange={(e) => setFrogInput(e.target.value)}
              placeholder="短链接/蛙语密钥（He9 校验和）…"
              className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
            />
            <button
              type="button"
              onClick={() => void submitFrog()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.32)] transition hover:bg-emerald-500/20"
            >
              <Terminal className="h-4 w-4" />
              Handshake
            </button>
          </div>

          <div className="mt-2 text-xs text-slate-400">
            [PROT-1.1] BinaryBagua 实时滚动；提交正确 He9 将返回造血凭证（Hash）。
          </div>
        </section>
      </div>
    </main>
  );
}
