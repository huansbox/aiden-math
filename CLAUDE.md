# aiden-math — 長除法練習網站

## 專案概述
國小三年級 iPad 友善的長除法練習網站。小孩透過「填框框」逐步完成 3 位數 ÷ 1 位數直式除法。

## 技術架構
- 純前端（HTML/CSS/JS），部署 GitHub Pages
- ES Modules，無 bundler
- 測試：Vitest

## 檔案結構
- `js/division.js` — 核心邏輯（純函式）
- `js/app.js` — UI 渲染 + 互動
- `css/style.css` — 樣式
- `tests/division.test.js` — 單元測試

## 核心函式（js/division.js）
- `generateProblem()` — 隨機產生題目（除數 2-9，被除數 100-999）
- `calculateSteps(dividend, divisor)` — 計算所有步驟
- `generateLayout(steps)` — 轉為 grid 佈局
- `validateInput(step, digit)` — 驗證單格輸入

## 開發指令
- `npm test` — 執行測試
- `npm run dev` — 本地開發伺服器
