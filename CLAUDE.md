# aiden-math — 長除法練習網站

## 專案概述
國小三年級 iPad 友善的長除法練習網站。小孩透過「填框框」逐步完成 3 位數 ÷ 1 位數直式除法。

## 技術架構
- 純前端（HTML/CSS/JS），部署 GitHub Pages
- ES Modules，無 bundler
- 測試：Vitest（23 tests passing）

## 檔案結構
- `js/division.js` — 核心邏輯（純函式，已完成）
- `js/app.js` — UI 渲染 + 互動（待實作）
- `css/style.css` — 樣式（佈局已完成，視覺打磨待做）
- `tests/division.test.js` — 單元測試（23 tests passing）
- `index.html` — 頁面結構（已完成）

## 核心函式（js/division.js）
- `generateProblem()` — 隨機產生題目（除數 2-9，被除數 100-999）
- `calculateSteps(dividend, divisor)` — 逐位處理，回傳 `{ quotient, remainder, rounds[] }`
- `generateLayout(steps, dividend, divisor)` — 轉為 grid cell 陣列，每個 cell 有 `{ row, col, value, type, fillable, order }`
- `validateInput(cell, digit)` — 驗證單格輸入

## Git 狀態
- `main` branch: Step 1-2 已 merge（init + core logic）
- `feat/grid-layout` branch: Step 3 已 commit（HTML + CSS），待 merge 回 main
- `feat/core-logic` branch: 已 merge，可刪除

## 當前進度
- [x] Step 1: 專案初始化 + TDD 基礎建設
- [x] Step 2: 核心除法邏輯（TDD，23 tests passing）
- [x] Step 3: HTML 結構 + CSS Grid 佈局
- [ ] Step 4: 互動系統（app.js 狀態機 + grid 渲染 + 鍵盤互動 + 提示文字）
- [ ] Step 5: UI 視覺打磨（綠色漸層、卡片、動畫 — CSS 骨架已在，需微調）
- [ ] Step 6: 基本遊戲化（streak、星星、慶祝動畫）
- [ ] Step 7: GitHub Pages 部署

## 開發指令
- `npm test` — 執行測試
- `npm run dev` — 本地開發伺服器（npx serve .）

## 開發規範
- 每個 Step 開新 branch（feat/xxx），完成後 merge 回 main
- Conventional Commits
- TDD：先寫測試再寫實作
