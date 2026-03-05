# aiden-math — 長除法練習網站

## 專案概述
國小三年級 iPad 友善的長除法練習網站。小孩透過「填框框」逐步完成 3 位數 ÷ 1 位數直式除法。

## 技術架構
- 純前端（HTML/CSS/JS），部署 GitHub Pages
- ES Modules，無 bundler
- 測試：Vitest（30 tests passing）

## 檔案結構
- `js/division.js` — 核心除法邏輯（純函式）
- `js/app.js` — UI 渲染 + 互動 + 遊戲化（狀態機、grid 渲染、數字鍵盤、延遲提示、streak、星星）
- `js/sound.js` — 音效回饋（Web Audio API 合成：答對/答錯/完成琶音）
- `js/daily.js` — 每日練習模式（localStorage 進度追蹤、每日 5 題 + 自由練習）
- `js/fireworks.js` — Canvas 煙火粒子特效（每日完成慶祝）
- `css/style.css` — 樣式（漸層背景、卡片、grid、numpad、動畫、iPad 安全區域、iPhone 響應式）
- `tests/division.test.js` — 除法邏輯測試（23 tests）
- `tests/daily.test.js` — 每日練習邏輯測試（7 tests）
- `assets/great-job-*.webp` — 10 張慶祝圖片（隨機輪替）
- `index.html` — 頁面結構
- `.github/workflows/static.yml` — GitHub Pages 部署 workflow

## 核心函式（js/division.js）
- `generateProblem()` — 隨機產生題目（除數 2-9，被除數 100-999）
- `calculateSteps(dividend, divisor)` — 逐位處理，回傳 `{ quotient, remainder, rounds[] }`
- `generateLayout(steps, dividend, divisor)` — 轉為 grid cell 陣列，每個 cell 有 `{ row, col, value, type, fillable, order }`
- `validateInput(cell, digit)` — 驗證單格輸入

## 部署
- GitHub Pages: https://huansbox.github.io/aiden-math/
- 自動部署：push 到 main 即觸發

## 響應式設計
- 桌機（≥768px）：置中、hover 效果
- iPad 橫式 + 桌機寬螢幕（≥768px landscape）：grid 左 + numpad 右並排佈局
- iPad 直式：clamp() 自適應尺寸，safe-area-inset-bottom，垂直堆疊
- iPhone（≤480px）：`--cell-size: 34px`、numpad 按鈕 64px、壓縮 padding/gap，一屏可見無需滾動

## 待開發
- 難度選擇（2 位數 / 3 位數 / 4 位數 ÷ 1 位數）

## 開發指令
- `npm test` — 執行測試
- `npm run dev` — 本地開發伺服器（npx serve .）

## 開發規範
- 每個 Step 開新 branch（feat/xxx），完成後 merge 回 main
- Conventional Commits
- TDD：先寫測試再寫實作
