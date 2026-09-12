import type { Dictionary } from './en.js';
import { authoringZh } from './authoring.js';
export const zhTW = {
  ...authoringZh,
  product: 'NxtCommit', discover: 'Discover', new_mission: 'New Mission',
  profile: 'My Commitment', demo: 'Demo', skip: '跳到主要內容',
  reset: '重設示範資料', reset_done: '示範資料已重設。',
  bootstrap_error: 'NxtCommit 無法載入工作階段資料。',
  build_note: '黑客松版本', disclaimer: '運算點數 ≈ AI 推理額度 — 並非貨幣',
  retry: '重試', language: '語言', loading: '載入中…',
  reset_error: '無法重設示範資料。', reset_pending: '重設中…',
  foundation_title: '共用基礎骨架',
  foundation_notice: '此路由是 Phase 1 佔位頁，產品流程尚未實作。',
  unavailable: '目前無法執行', local_persona: '本機示範角色',
  not_found: '找不到頁面', back_home: '返回 Discover',
  english: 'English', traditional_chinese: '繁體中文',
  wallet: '運算點數', demo_mode: '示範 runner', llm_mode: 'LLM runner', codex_mode: 'Codex runner',
  no_isolation: '沒有 per-run OS isolation', isolated: 'Per-run OS isolation',
  truth: '本機示範角色與運算點數；沒有身份驗證、付款或上游發布。',
} satisfies Dictionary;
