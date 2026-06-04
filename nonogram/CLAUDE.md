# 數織解謎（nonogram）

iPad 友善的數織解謎網頁，部署在 GitHub Pages 的 `/nonogram/`。純前端、ES Modules、無 bundler。
完整需求／落地調整見已關閉的 GitHub issue #1（PRD）。以下只記「維護必用、但讀 code 不易查、且不太會變」的事。

## 架構：純邏輯 / DOM 分離

- 純函式（有 Vitest）：`nonogram.js`（攤平 `buildSolution`／提示 `computeClues`／比對 `checkAnswer`／填錯 `diffCells`／分隔線 `letterDividerCols`／輸入閘 `validateWord`）、`library.js`（題庫／過關紀錄）、`settings.js`、`font.js`（字模資料）。
- `js/app.js`：只負責 DOM + localStorage，**無自動化測試**，UI／觸控以實機手測驗收。
- 改邏輯 → 先動純函式並補 `tests/*.test.js`；改互動才動 app.js。

## 改題目前必讀：字模

- 字模是**比例字寬**，不是固定 5×3：多數字母與全部數字 3 欄；**4 欄 = G J K N P R**、**5 欄 = M W**。
- **不收 Q**（點陣下與 O 難分，共 35 字模）→ `wordlist.txt` 與自訂出題**一律避開含 Q 的字**；`buildSolution` 遇無字模字元會 throw。
- 字母分隔線由各字寬**累加**推算（`letterDividerCols`），不是 `col % 3`。

## 核心規則與持久化（非顯而易見）

- **過關門檻＝打字答案正確**（大小寫不敏感），格子塗對與否不影響過關；過關後才比對格子標多塗／漏塗。
- 過關紀錄以**單字本身**為 key、命名空間 `builtin:`（重排 wordlist 不會掉★）。localStorage 鍵：`nonogram:progress`、`nonogram:settings`。

## UI 決策（容易被誤「改回去」）

- **鍵盤是遊戲卡片下方的 in-flow 區塊**（CSS `max-height` 滑開），不是固定底部浮層。原因：14 欄寬格盤受卡片寬度決定、幾乎縮不動，固定浮層會在卡片與鍵盤間留死空白。→ 刻意**不做**「開鍵盤縮小格盤讓位」。
- 答案欄用 **`pointerdown`**（非 `click`）叫出鍵盤：div 在觸控下若 tap 有微小位移會被當 pan 而不合成 click，iPad 點不出來。
- `app.js` 的 `SHOW_CUSTOM = false`：自訂出題的程式碼與測試保留，但暫從首頁隱藏；改 `true` 即開回。

## 改 CSS／app.js 必做

- `index.html` 對 `css/style.css` 與 `js/app.js` 的引用都帶 `?v=YYYYMMDDx` cache-busting，**改任一檔都要 bump 版本**，否則瀏覽器沿用舊檔（曾因 css 版本在兩分支撞號，導致整組樣式沒更新、功能像壞掉）。
