# aiden-math — 長除法練習網站

## 專案概述
國小三年級 iPad 友善的長除法練習網站。小孩透過「填框框」逐步完成 3 位數 ÷ 1 位數直式除法。

## 技術架構
- 純前端（HTML/CSS/JS），部署 GitHub Pages
- ES Modules，無 bundler
- 測試：Vitest（23 tests passing）

## 檔案結構
- `js/division.js` — 核心除法邏輯（純函式）
- `js/app.js` — UI 渲染 + 互動 + 遊戲化（狀態機、grid 渲染、數字鍵盤、提示文字、streak、星星）
- `css/style.css` — 樣式（漸層背景、卡片、grid、numpad、動畫、iPad 安全區域）
- `tests/division.test.js` — 單元測試（23 tests passing）
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

## 進度
- [x] Step 1: 專案初始化 + TDD 基礎建設
- [x] Step 2: 核心除法邏輯（TDD，23 tests passing）
- [x] Step 3: HTML 結構 + CSS Grid 佈局
- [x] Step 4: 互動系統（狀態機 + grid 渲染 + 鍵盤互動 + 提示文字）
- [x] Step 5: UI 視覺打磨（觸控回饋、iPad 安全區域）
- [x] Step 6: 基本遊戲化（streak、星星、慶祝動畫）
- [x] Step 7: GitHub Pages 部署

## 開發指令
- `npm test` — 執行測試
- `npm run dev` — 本地開發伺服器（npx serve .）

## 開發規範
- 每個 Step 開新 branch（feat/xxx），完成後 merge 回 main
- Conventional Commits
- TDD：先寫測試再寫實作
