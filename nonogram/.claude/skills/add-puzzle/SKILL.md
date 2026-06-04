---
name: add-puzzle
description: 新增（或移除）數織解謎（nonogram）題庫的題目。當使用者要加單字/題目到 wordlist、擴充或調整數織題庫、或問「怎麼新增題目」時使用。涵蓋 wordlist 編輯、字模限制（避開 Q、格盤寬度上限）、同步更新 library.test.js 的預期清單、跑測試與部署。
---

# 新增數織題目（add-puzzle）

把新單字加進數織題庫並安全上線。題庫來源＝`wordlist.txt`（一行一字，自動轉大寫，`#` 開頭為註解、空行略過）。過關靠打字答案、不需唯一解，所以單字只要字模都有就能出。

## 流程

1. **編輯 `wordlist.txt`**：在新的一行加入單字。先確認字元與格盤寬度都在限制內（見下方限制）。

2. **同步更新測試 `tests/library.test.js`（最容易漏！）**
   - 該檔的「#5 驗收」測試硬編了目前題庫清單：`expect(parseWordlist(wordlistText)).toEqual([ ... ])`。把新字**按 wordlist 的順序**加進那個陣列，否則測試會紅。
   - 另兩個測試（`buildSolution` 不丟錯、格盤欄數 ≤ 18 護欄）會自動涵蓋新字、不用改；但**新字若超過 18 欄會紅燈**——那是「太寬該換字」的訊號，別去調高閾值（理由見下方限制）。

3. **跑測試**（測試與 `package.json` 在 repo 根目錄，不在 `nonogram/`）：
   ```bash
   cd "$(git rev-parse --show-toplevel)" && npm test
   ```
   要綠燈才繼續。

4. **commit + push**（git 在 repo 根，從哪個子目錄都能跑）：
   ```bash
   git add nonogram/wordlist.txt nonogram/tests/library.test.js
   git commit -m "feat(nonogram): 題庫新增 <單字>"
   git push origin main
   ```
   push 到 main 會自動觸發 GitHub Pages 部署。

## 限制（來自字模 `font.js`）

- **只能用 A–Z（不含 Q）+ 0–9**，共 35 字模。含 **Q** 或標點的字會被 `parseWordlist` **靜默濾掉**（不報錯、但那題不會出現；步驟 2 的預期清單也不該放它）。
- **格盤寬度上限 18 欄（`library.test.js` 有測試護欄自動擋）**：真正決定寬度的是**總欄數**（各字模欄寬累加），不是字母數——`MWW` 才 3 字母卻 15 欄。欄寬：多數字母與數字 3 欄、`G J K N P R` 4 欄、`M W` 5 欄。要精確知道某字幾欄，在 repo 根跑：
  ```bash
  node --input-type=module -e "import {buildSolution} from './nonogram/nonogram.js'; console.log(buildSolution('YOURWORD').cols)"
  ```
  閾值 18 = 現有最寬 `AIDEN`/`EAGLE`(16) + 2 欄緩衝；再寬手機格子會頂 14px 下限、偏擠。4–5 字母多半落在範圍內，但別拿字母數當準——超標跑測試自然紅燈。
- 加完用瀏覽器掃一眼新題（repo 根跑 `npm run dev` → 開 `…/nonogram/`）：字模在小尺寸下的辨識度靠人眼，特別看相鄰字母會不會糊。

## Gotchas

- **改 wordlist 不必 bump cache 版本**：wordlist 用 `fetch(..., {cache:'no-store'})` 抓，一定最新。（只有改 `css/style.css` 或 `js/app.js` 才要更新 `index.html` 的 `?v=` 參數。）
- **過關★以單字為 key**（`builtin:WORD`）：新增/重排 wordlist 不會弄丟既有★；但**改某題拼字**＝換 key，舊★會變孤兒。
- **移除題目**：從 wordlist 刪行 + 同步從 `library.test.js` 的預期清單刪掉，再跑測試。
