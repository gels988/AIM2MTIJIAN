# Security Audit Report / 安全审计报告 — AIM2MTIJIAN v1

Project-ID / 项目ID: AIM2MTIJIAN  
Audit date / 审计日期: 2026-04-07  
Scope / 范围: Next.js (App Router) Web UI + API routes + “商业秘密脱敏/加密”实现  
Repository root / 仓库根目录: `d:\AIM2MTIJIAN`

---

## 1. Executive Summary 执行摘要
- Overall risk level / 总体风险等级: **High / 高**
- Critical/High findings count / 严重/高危数量: **2 Critical / 2 严重**, **2 High / 2 高危**
- Production readiness / 上线结论: **Not production-ready / 不建议直接生产上线**（当前“解锁/激活码/商业秘密”三条主线存在可被直接绕过或被动泄露的确定性路径；需先完成修复清单。）

**Top risks / 最高优先级风险**
- **Paywall/授权为纯前端 localStorage 逻辑**，存在确定性绕过，导致“付费解锁”可被任何人免费打开（见 [page.tsx](file:///d:/AIM2MTIJIAN/app/page.tsx#L220-L343)）。
- **“商业秘密”在客户端与网络响应中明文存在**：维度名在 API 返回中可直接抓包获得（见 [inspect/route.ts](file:///d:/AIM2MTIJIAN/app/api/inspect/route.ts#L3-L48)），同时“能量映射表/脱敏词表”被打包到前端（见 [security_core.ts](file:///d:/AIM2MTIJIAN/src/security/security_core.ts#L1-L195)），无法形成实际保密。

---

## 2. Methodology 审计方法论
- Techniques / 技术: Static review (TypeScript/Next.js), threat-modeling, configuration review, “商业秘密泄露路径”逆向推导
- Depth / 深度: White-box / 白盒
- Toolchain / 工具链:
  - Next.js 16.2.2 / React 19.2.4 (见 [package.json](file:///d:/AIM2MTIJIAN/package.json#L11-L22))
  - ESLint 9 + eslint-config-next 16.2.2 (见 [package.json](file:///d:/AIM2MTIJIAN/package.json#L23-L31))
  - Lint/Build executed / 已执行: `npm run lint`, `npm run build`（本机验证通过）

Limitations / 限制:
- 未对真实 Supabase 项目（RLS、表结构、API keys 管理）进行线上黑盒渗透；本报告对 Supabase 侧给出“必须满足/必须不存在”的控制项。

---

## 3. Trust Model 信任模型
- Client (browser) / 客户端: **不可信**（用户可修改 localStorage、拦截/重放请求、篡改 DOM/CSS、修改打印输出）
- Network / 网络: **不可信**（HTTP 请求可被观察/重放；需假设攻击者可抓包）
- Server (Next API routes) / 服务端: 仅在 API routes 内可建立可信计算边界
- Supabase / 外部依赖:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 为公开客户端密钥，必须依赖 RLS/策略来实现最小权限
- Third-party deps / 第三方依赖: recharts / framer-motion / lucide-react 等属于供应链风险来源

Single points of failure / 单点风险:
- 任何“保密逻辑”若下发到浏览器，即 **必然泄露**（不是概率问题，是确定性结论）。

---

## 4. Core Logic Security 核心逻辑安全
Business-critical paths / 关键路径:
- 体检流程: 输入 → 启动 → 进度到 100 → 弹出支付 → 解锁报告
- 商业秘密防护: “维度名/仪器方法”不应出现在前端/网络层
- 激活码: 应由服务端使用私钥/密钥验证，客户端只提交，不参与校验

Verified issues / 已验证问题（确定存在）:
- 报告解锁依赖 `localStorage` 状态：`AIM2M_STATUS === "ACTIVE"` → `reportUnlocked=true`（见 [page.tsx](file:///d:/AIM2MTIJIAN/app/page.tsx#L220-L319)）。用户可手动写入 localStorage 直接绕过付费。
- 激活码校验算法与 SALT 常量存在于前端（见 [page.tsx](file:///d:/AIM2MTIJIAN/app/page.tsx#L203-L218)），攻击者可离线生成/枚举有效码。
- 维度名仍由服务端 API 明文返回（见 [inspect/route.ts](file:///d:/AIM2MTIJIAN/app/api/inspect/route.ts#L3-L48)），客户端脱敏仅影响 UI 显示，无法阻止抓包获取。

---

## 5. Data Security 数据安全
At-rest / 静态数据:
- 当前无数据库持久化体检报告；本地 `localStorage` 用于“解锁状态”与“商业流程”属于低可信存储。

In-transit / 传输:
- `/api/w2w` 接收任意 body 并回显长度（见 [w2w/route.ts](file:///d:/AIM2MTIJIAN/app/api/w2w/route.ts#L1-L10)），缺少尺寸限制/鉴权/速率限制，存在 DoS 与噪声数据注入风险。

Privacy & compliance / 隐私与合规:
- PDF 暗水印注入为前端 DOM+CSS 机制（见 [security_core.ts](file:///d:/AIM2MTIJIAN/src/security/security_core.ts#L170-L195) 与 [globals.css](file:///d:/AIM2MTIJIAN/app/globals.css#L69-L97)），用户可通过禁用 CSS/修改打印设置绕过；对“确权与追溯”不具备强保证。

---

## 6. Identity & Access Control 身份与访问控制
Role matrix / 角色矩阵: **未定义**（当前系统没有用户登录/会话、没有权限边界）

Privilege escalation / 越权:
- 解锁状态为客户端可写：`localStorage.setItem("AIM2M_STATUS","ACTIVE")`（见 [page.tsx](file:///d:/AIM2MTIJIAN/app/page.tsx#L315-L332)）。这属于“业务鉴权缺失”，不是 UI 问题。

Required remediation direction / 必须的修复方向:
- 所有“付费/激活码/积分”判定必须移到服务端或 Supabase（RLS + RPC / Edge Function），客户端仅展示结果。

---

## 7. Smart-Contract Specifics (if applicable) 智能合约专项（如适用）
当前仓库不存在链上合约代码与部署地址，链上风险 **不存在**（以当前仓库为证据）。  

Forward-looking / 前瞻建议（若未来引入链上组件，建议预设安全接口）:
- 预设合约升级与权限：Timelock + Multi-sig + Emergency pause
- 所有“激活码/积分/兑换”若上链，必须有防重放、防女巫、可审计事件日志与速率限制

---

## 8. Attack Resilience 抗攻击能力
Current gaps / 当前缺口:
- No rate limiting / 无速率限制：`/api/w2w`、`/api/inspect` 均可被高频调用
- No telemetry / 监控缺失：缺少结构化日志、告警、请求追踪（request-id）
- No abuse controls / 滥用控制缺失：缺少 body size limit、CORS 策略明确化、WAF/CDN 规则

---

## 9. Vulnerability Findings 漏洞清单 (CVSS 3.1)

### AIM2M-01 — Client-side unlock via localStorage (Paywall bypass) / 前端 localStorage 授权可直接绕过
- Severity / 严重性: **Critical / 严重**
- Evidence / 证据:
  - 读取解锁状态：`localStorage.getItem("AIM2M_STATUS") === "ACTIVE"`（见 [page.tsx](file:///d:/AIM2MTIJIAN/app/page.tsx#L230-L233)）
  - 解锁写入：`localStorage.setItem("AIM2M_STATUS", "ACTIVE")`（见 [page.tsx](file:///d:/AIM2MTIJIAN/app/page.tsx#L315-L332)）
- Impact / 影响:
  - 任意用户无需支付即可解锁报告，直接造成收入损失与业务逻辑失效
- PoC / 复现:
  - 浏览器控制台执行：`localStorage.setItem('AIM2M_STATUS','ACTIVE'); location.reload();` → 报告解锁
- Remediation / 修复（可复制粘贴）:
  - 将解锁状态迁移到服务端签名票据（JWT/HMAC）或 Supabase 表（RLS 控制），客户端只存短期不可伪造 token：
    - 服务端生成：`Set-Cookie: aim2m_unlock=<signed_token>; HttpOnly; Secure; SameSite=Lax`
    - 客户端判断只依据服务端返回
- CVSS 3.1: **AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1**

### AIM2M-02 — “Commercial secret” disclosure via API & shipped mapping / 商业秘密在 API 响应与前端包中可直接获取
- Severity / 严重性: **High / 高危**
- Evidence / 证据:
  - 维度名在 API 返回中明文：`DIMENSIONS = ["AutoResearch","MASFactory","DyTopo","Harness","Hexagram"]`（见 [inspect/route.ts](file:///d:/AIM2MTIJIAN/app/api/inspect/route.ts#L3-L44)）
  - “脱敏词表/能量映射表”存在于前端源码并会被打包下发：`WORDS_TO_HIDE`、`ENERGY_MAP`（见 [security_core.ts](file:///d:/AIM2MTIJIAN/src/security/security_core.ts#L1-L120)）
- Impact / 影响:
  - 竞争者可通过抓包与前端源码直接还原维度与“脱敏方案”；无法达到“逼退跟风者/保密仪器方法”的目标
- PoC / 复现:
  - 访问 `/api/inspect` 响应可直接看到维度名；查看前端 bundle 可直接找到 ENERGY_MAP 与脱敏逻辑
- Remediation / 修复（可复制粘贴）:
  - 服务端改为返回维度 ID（如 `D1..D5`）与数值，客户端永远不接触真实维度名
  - 所有能量映射/脱敏规则迁移到服务端（仅输出不可逆 token），前端仅渲染 token
- CVSS 3.1: **AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N = 7.5**

### AIM2M-03 — Activation code verification fully client-side / 激活码校验完全在前端，salt 明文
- Severity / 严重性: **High / 高危**
- Evidence / 证据:
  - `ACTIVATION_SALT` 常量与校验算法在前端（见 [page.tsx](file:///d:/AIM2MTIJIAN/app/page.tsx#L203-L218)）
- Impact / 影响:
  - 任意攻击者可离线生成有效激活码，绕过支付/积分体系
- PoC / 复现:
  - 读取 salt 与算法后，可批量生成 `AIM2M-XXXX-YYYY-OFFLINE` 使校验通过
- Remediation / 修复（可复制粘贴）:
  - 前端仅提交激活码到服务端 `/api/activate`；服务端使用 `process.env.ACTIVATION_SECRET` 做 HMAC 校验
  - 校验通过后由服务端下发 HttpOnly cookie 或写入 Supabase 用户解锁表
- CVSS 3.1: **AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1**

### AIM2M-04 — Unbounded unauthenticated ingestion endpoint /api/w2w (DoS/abuse) / /api/w2w 无鉴权无尺寸限制
- Severity / 严重性: **High / 高危**
- Evidence / 证据:
  - `req.text()` 未限制尺寸，任意人可 POST（见 [w2w/route.ts](file:///d:/AIM2MTIJIAN/app/api/w2w/route.ts#L1-L10)）
- Impact / 影响:
  - 可被大包/高频请求导致资源耗尽，影响可用性
- Remediation / 修复（可复制粘贴）:
  - 添加 body 大小限制与速率限制（Edge + KV 计数 / 中间件）
  - 仅接受 JSON：`JSON.parse` + schema 校验 + 丢弃未知字段
- CVSS 3.1: **AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H = 7.5**

### AIM2M-05 — Watermark is not tamper-resistant / 水印为前端样式注入，无法抗篡改
- Severity / 严重性: **Low / 低**
- Evidence / 证据:
  - 水印通过 DOM 注入 + print CSS 实现（见 [security_core.ts](file:///d:/AIM2MTIJIAN/src/security/security_core.ts#L170-L195)）
- Impact / 影响:
  - 用户可通过修改打印设置/移除样式/截图等方式绕过“确权追溯”
- Remediation / 修复:
  - 服务端生成 PDF 并在 PDF 内容层写入水印（不可见层+元数据），客户端仅下载
- CVSS 3.1: **AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N = 3.5**

---

## 10. Security Maturity Score 安全成熟度 (1-10)
- Score / 得分: **4.2 / 10**
- Architecture (30%) / 架构: 0.9/3.0（关键鉴权在客户端）
- Code quality (20%) / 代码质量: 0.9/2.0（类型完善，但缺少边界控制）
- Monitoring (20%) / 监控: 0.4/2.0（缺少速率限制、告警、审计日志链路）
- Transparency (15%) / 透明度: 1.2/1.5（可追踪性设计有方向，但实现不具备抗篡改）
- Incident readiness (15%) / 应急: 0.8/1.5（缺少开关、熔断、风控策略）

---

## 15-minute Remediation Checklist / 15 分钟修复清单（按影响×可利用性排序）
- 将“解锁/激活码/积分”判定迁移到服务端（HttpOnly cookie 或 Supabase RLS 控制的表）
- 修改 `/api/inspect`：返回维度 ID 而不是明文维度名；前端仅显示脱敏 token
- 删除或移出前端的 `ENERGY_MAP/WORDS_TO_HIDE`（把映射放到服务端；前端只拿不可逆结果）
- 给 `/api/w2w` 添加：body size limit + schema 校验 + 速率限制
- 若需强水印：改为服务端生成 PDF 并写入不可见层水印

