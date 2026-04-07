import "server-only";

import { createHash } from "crypto";

export const HIDDEN_DIMENSIONS = [
  "HARNESS",
  "易经GBAGUA",
  "KARPATHY AUTORSEACH",
  "MAS FACTOURY",
  "DYTOPO",
] as const;

export type TopMetricKey =
  | "TASK_SUCCESS"
  | "PLANNING"
  | "TOOL_USE"
  | "RETRIEVAL"
  | "MEMORY"
  | "ROBUSTNESS"
  | "EFFICIENCY"
  | "SAFETY"
  | "GENERALIZATION"
  | "METACOGNITION";

export const TOP_10_METRICS: Array<{
  key: TopMetricKey;
  label: string;
}> = [
  { key: "TASK_SUCCESS", label: "任务达成率 (Task Success)" },
  { key: "PLANNING", label: "目标分解与规划 (Planning)" },
  { key: "TOOL_USE", label: "工具调用与执行 (Tool Use)" },
  { key: "RETRIEVAL", label: "证据驱动与检索 (Retrieval)" },
  { key: "MEMORY", label: "记忆与上下文管理 (Memory)" },
  { key: "ROBUSTNESS", label: "鲁棒性与自愈 (Robustness)" },
  { key: "EFFICIENCY", label: "计算与步骤效率 (Efficiency)" },
  { key: "SAFETY", label: "安全与合规边界 (Safety)" },
  { key: "GENERALIZATION", label: "跨域泛化能力 (Generalization)" },
  { key: "METACOGNITION", label: "元认知与不确定性校准 (Metacognition)" },
];

const SERVER_ENERGY_MAP: Record<string, string> = {
  "00": "望远镜",
  "01": "小树",
  "02": "铃儿",
  "03": "凳子",
  "04": "轿车",
  "05": "手套",
  "06": "手枪",
  "07": "锄头",
  "08": "溜冰鞋",
  "09": "猫",
  "10": "棒球",
  "11": "楼梯",
  "12": "椅子",
  "13": "医生",
  "14": "钥匙",
  "15": "鹦鹉",
  "16": "石榴",
  "17": "仪器",
  "18": "糖葫芦",
  "19": "衣钩",
  "20": "香烟",
  "21": "鳄鱼",
  "22": "双胞胎",
  "23": "和尚",
  "24": "闹钟",
  "25": "二胡",
  "26": "河流",
  "27": "耳机",
  "28": "恶霸",
  "29": "饿囚",
  "30": "三轮车",
  "31": "鲨鱼",
  "32": "扇儿",
  "33": "星星",
  "34": "三丝",
  "35": "山虎",
  "36": "山鹿",
  "37": "山鸡",
  "38": "妇女",
  "39": "山丘",
  "40": "司令",
  "41": "蜥蜴",
  "42": "柿儿",
  "43": "石山",
  "44": "蛇",
  "45": "师父",
  "46": "饲料",
  "47": "司机",
  "48": "石板",
  "49": "湿狗",
  "50": "武林",
  "51": "工人",
  "52": "鼓儿",
  "53": "乌纱帽",
  "54": "青年",
  "55": "火车",
  "56": "蜗牛",
  "57": "武器",
  "58": "尾巴",
  "59": "蜈蚣",
  "60": "榴莲",
  "61": "儿童",
  "62": "牛儿",
  "63": "流沙",
  "64": "螺丝",
  "65": "绿壶",
  "66": "溜溜球",
  "67": "绿漆",
  "68": "喇叭",
  "69": "太极",
  "70": "麒麟",
  "71": "鸡翼",
  "72": "企鹅",
  "73": "花旗参",
  "74": "骑士",
  "75": "西服",
  "76": "汽油",
  "77": "机器",
  "78": "青蛙",
  "79": "气球",
  "80": "巴黎",
  "81": "白蚁",
  "82": "靶儿",
  "83": "芭蕉扇",
  "84": "巴士",
  "85": "保姆",
  "86": "八路",
  "87": "白旗",
  "88": "爸爸",
  "89": "芭蕉",
  "90": "酒瓶",
  "91": "球衣",
  "92": "球儿",
  "93": "旧伞",
  "94": "首饰",
  "95": "酒壶",
  "96": "蝴蝶",
  "97": "旧旗",
  "98": "酒杯",
  "99": "舅舅",
};

export function serverEnergyEncode(rawStr: string): string {
  const hash = createHash("sha256").update(rawStr).digest("hex");
  const encodedWords: string[] = [];
  for (let i = 0; i < 6; i += 2) {
    const val = parseInt(hash.substring(i, i + 2), 16) % 100;
    const key = val.toString().padStart(2, "0");
    encodedWords.push(SERVER_ENERGY_MAP[key] || "未知能量");
  }
  return encodedWords.join("·");
}

export type ObfuscatedDatum = {
  id: string;
  token: string;
  value: number;
};

export function getObfuscatedData(realData: Array<{ name: string; value: number }>) {
  return realData.map((item, index) => ({
    id: `DIM_${index}`,
    token: serverEnergyEncode(item.name),
    value: item.value,
  })) satisfies ObfuscatedDatum[];
}

export type PublicMetricRow = {
  id: string;
  metric: TopMetricKey;
  label: string;
  score: number;
  percentile: number;
  status: "excellent" | "good" | "warn" | "risk";
};

export function buildTop10Metrics(input: Record<TopMetricKey, number>) {
  const rows: PublicMetricRow[] = TOP_10_METRICS.map((m, idx) => {
    const score = Math.max(0, Math.min(100, Math.round(input[m.key] ?? 0)));
    const percentile = Math.max(1, Math.min(99, 100 - Math.round((100 - score) * 0.7)));
    const status: PublicMetricRow["status"] =
      score >= 90 ? "excellent" : score >= 80 ? "good" : score >= 65 ? "warn" : "risk";
    return {
      id: `M_${idx + 1}`,
      metric: m.key,
      label: m.label,
      score,
      percentile,
      status,
    };
  });
  return rows;
}
