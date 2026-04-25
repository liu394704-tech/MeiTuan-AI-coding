# 慢病用药小管家

> 面向慢性病患者的「问诊 → 用药计划 → 用药提醒 → 库存 → 复诊」全生命周期网页应用。

详细产品与工程设计见 [`DESIGN.md`](./DESIGN.md)。

---

## 特性

- **今日服药看板**：黄金 3 卡（今日进度 / 库存预警 / 复诊倒计时）
- **3 步添加药品**：基本信息 → 用法（频率模板）→ 库存
- **一键打卡**：≥56px 高的大按钮，2 秒内可撤销
- **库存智能预测**：日均消耗 → 剩余天数 → 自动购药清单
- **AI 健康助手**（规则引擎）：依从性评分、库存预警、风险提示、健康建议
- **复诊提醒**：可手动安排，可由系统按用药周期建议
- **适老化**：默认 16px，提供「标准 / 大字 / 特大」三档全局字号切换；按钮触控目标 ≥48–64px；高对比度配色

## 技术栈

- Vite 5 + React 18 + TypeScript（strict）
- Zustand（按领域切片）
- React Router v6
- Tailwind CSS（设计 token）
- Recharts（依从性趋势）
- dayjs（时间处理）
- localStorage 持久化（默认 mock 后端）

## 工程结构

```
src/
├── ai/                # 规则引擎（adherence/stock/risk/tip）
├── components/
│   ├── ui/            # Button/Card/Modal/Input/Tag
│   ├── layout/        # AppShell（顶部 + 桌面 Sidebar + 移动 TabBar）
│   └── domain/        # AdherenceRing / StockBar / DoseItem
├── hooks/             # useTodayDoses / useAdherence / useStockForecasts / useInsights
├── mock/              # localStorage db + seed 数据
├── pages/             # Dashboard / Today / Medications / Inventory / FollowUp / Insights / Profile
├── services/          # API 层（唯一网络出口，方便替换真后端）
├── store/             # Zustand store
├── styles/            # 设计 token + 全局样式
├── types/             # 全局 TS 类型
└── utils/             # eventGenerator / adherence / forecast / date
```

## 运行

```bash
npm install
npm run dev
# 浏览器访问 http://localhost:5173
```

构建：

```bash
npm run build
npm run preview
```

## 数据说明

首次启动会写入示例数据（用户「张大爷」+ 3 种药品 + 28 天用药事件）。所有数据存储在浏览器 `localStorage`（key：`cmm.db.v1`），可在「个人中心 → 重置为示例数据」中清除。

## 替换为真后端

`src/services/index.ts` 是唯一的网络/数据出口。替换实现（如 `fetch('/api/...')`）即可，store 与页面无需改动。
