# 共通の開発手順

対象は `hane-san/ARPG-01-SkyrimStyle`（旧 `hane-san/ARPG` / `hane-san/Koitototsukuru`）。全AIの契約は [AGENTS.md](../AGENTS.md)、
Claude Codeの読込入口は [CLAUDE.md](../CLAUDE.md)。GitHub Docs/Issue/PRとGit履歴で引き継ぐ。
ゲーム固有の構造は維持し、未共有のチャット・AIの記憶を推測しない。

## 現在の運用：自動操縦（2026-11-14〜、人間の指示）

Issueを起票すれば、振り分け→実装→検品→マージまで止まらずに進む段階。D013（マージまでの常設の委任）を全ての採用済みIssue・PRへ広げた運用。安定化へ切り替えると人間が決めるまで、この節が下の「人間がマージする」手順より優先する。規程の正本は `AGENTS.md` の「Autopilot phase」、仕組みは [AUTOPILOT](AUTOPILOT.md)。

- **流れ**：持ち主のアカウントのIssue（GPT・Claudeのチャットや他のAIから）→ 1時間ごとの Claude Code の定期タスク「自動操縦の見回り」が振り分け、`lane/auto`（low・medium）を1件ずつ実装してPR → 必須チェック（`rules`・`browser`・`gate`）が緑になったら GitHub の auto-merge が merge commit でマージ。`lane/claude`（high）は、はねさんが Claude Code に直接頼む。
- **採用済みの扱い**：持ち主のアカウント（GPT・Codex・Claudeの代理を含む）のIssue・PRは採用済み。タイトルが「提案」で始まるもの、本文でこの変更を「未採用」「保留」「マージ保留」と明言しているもの、`hold` / `proposal` ラベル付きは実装・マージしない。
- **安全装置**：mainのCIが失敗したら、非常停止係が「main is red」Issue（`autopilot-stop` ラベル）を立てる。このラベルのIssueが開いている間、見回りは新しい実装をせず revert PR を出す。閉じれば再開。止めたいPRには `hold`。
- **人間の確認は夕方の試遊にまとめる**：独立監査・iPhone実機・実耳は未実施として記録し、済んだとは書かない。
- **引き続き禁止**：mainへ直接push、force-push・履歴の書換え、PRのApprove、AIによるSettings・Secrets・Variables・Rulesetの変更、テストの削除・弱体化、repo名・表示名・保存キーの変更、他のリポジトリの操作、配線の修正以外での `.github/workflows` の変更。
- **毎日の報告**：18時（日本時間）以降の最初の見回りが「自動操縦の日報」Issueへコメントする。
- シナリオ・世界観の方向性は `docs/DIRECTION.md`（最初に必要になったPRで作る）にまとめ、はねさんが採用した部分だけを実装する。

## 作業の始め方

1. `git status --short` と `git log -5 --oneline` で現在地と未コミット変更を確認。
2. `git fetch origin` 後、[DESIGN.md](DESIGN.md)、[DECISIONS.md](DECISIONS.md)、[ROADMAP.md](ROADMAP.md)、対応Issueを読む。
3. 開いているIssue/PRと他の担当者の編集範囲を確認する。未コミット変更を捨てず、同じファイルの並行作業は範囲を調整する。
4. クリーンな状態で最新 `origin/main` から `git switch -c <type>/<issue>-<topic> origin/main`。`npm run build` / `npm run check` で基準を確認してから編集。

## 採用判断からmainまで

1. **Chatで採用判断**：はねさんが採用した内容だけを依頼にする。採用済み・提案・保留・変更/旧仕様・未検証を分け、採用元と理由をIssueや [DECISIONS.md](DECISIONS.md) に記録。
2. **Issue**：目的、採用済み仕様、肯否を判定できる受入条件、対象外、不変条件、影響、リスクと理由、検証・試遊、未決事項を書く。実装に必要な仕様が矛盾・不足していれば、その箇所を切り出して決裁を求め、創作で埋めない。
3. **実装ラインとブランチ**：CodexとClaude Code/Sonnetは対等な候補。利用枠・接続・端末・既存文脈で選び、モデルの利用可否は実環境で確認する。
4. **PR**：対応Issue、実際の担当・環境、差分、受入条件ごとの結果、検証したSHA、入力・保存・公開への影響、未実行理由、試遊項目を記載。`git push -u origin <work-branch>` で専用ブランチだけを送る。
5. **CIと監査**：Actionsとリスクに応じた独立監査を確認。修正は作業ブランチへ戻し、関連検証を再実行する。自己確認は独立監査として数えない。
6. **人間の試遊・承認**：はねさんが面白さと仕様の採否、main統合を判断。文書だけならゲーム試遊を省く理由と文書の確認結果を残せる。
7. **mainへ統合・公開**：必須チェックの合格で auto-merge がマージ（上の「自動操縦」）。main直接push、force-pushを行わない。mainが進んだら差分を確認して統合・再検証し、他者の変更を上書きしない。公開後のPagesと主要操作を確認する。

| リスク | 例 | 監査の扱い |
|---|---|---|
| low | 文言、独立資料、影響が限定された小修正 | 関連CIと人間確認。独立監査を省く場合は理由をPRへ記録 |
| medium | 個別UIフロー、景観・地域追加、単一機能 | 実装者と別担当・別セッションで変更周辺と境界条件を独立レビュー |
| high | 地形基盤、横断的な入力・衝突・描画、将来の保存・世界状態 | 実装前の技術設計と深い独立監査。必要ならClaude Code/Opusの重点監査 |

監査は役割で指定し、特定モデルの版に固定しない。担当が使えない場合は未実施と理由をPRへ残し、必要な監査を完了扱いにせず、人間に経路を判断してもらう。
監査結果は **PASS/WARN/BLOCK、対象SHA、再現条件・期待/実際、実行済み・未検証、修正方針、Opus上申要否、翌朝の試遊項目** としてPRへ残す。
BLOCK相当の問題は実装へ差し戻し、WARNは人間へ残リスクを伝える。PASS/WARN/BLOCKは報告語であり、GitHubの必須CI・人間承認とは別。
監査後に差分が増えたら、対象SHAを更新して影響範囲を再検証する。

## 実行と検証

Node.js 22+、Python 3.12（CI）。ゲームの実行に外部パッケージ・CDNは不要。

```sh
npm run build
npm run check
npm run dev
# http://localhost:4173 （dist/を配信）
```

`dist/` がソースの正本。buildは単体HTML、dist manifest、既存アイコン、`.nojekyll` を生成する。
ソースを変えたらbuildを実行し、生成物も差分に含める。文書だけなら版・release・生成物を変えない。
`git diff --check` と差分を確認し、スクリーンショット・キャッシュ・個人用設定をコミットしない。

ブラウザ検査の依存は一時的な仮想環境へ導入できる：

```sh
python3 -m venv /tmp/nagi-qa
/tmp/nagi-qa/bin/python -m pip install playwright==1.57.0
/tmp/nagi-qa/bin/python -m playwright install chromium
export CHROMIUM_PATH="$(/tmp/nagi-qa/bin/python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')"
/tmp/nagi-qa/bin/python tests/browser-check.py
/tmp/nagi-qa/bin/python tests/controls-check.py
/tmp/nagi-qa/bin/python tests/world-check.py
/tmp/nagi-qa/bin/python tests/sky-check.py
/tmp/nagi-qa/bin/python tests/journey-check.py
```

Linuxの共有ライブラリが不足する環境では、Playwrightの `install --with-deps chromium` を使う。
既存 `/usr/bin/chromium` を使う場合は `CHROMIUM_PATH` を省略できる。
検査スクリプトはrootを配信するサーバーを自ら起動するため、同じポートでdevを同時起動しない。
詳しい範囲とポート、実機との違いは [QA.md](QA.md)。

## 実装の境界と引継ぎ

- `dist/movement.js`：描画から独立した入力・移動・継続加速・衝突。詳細は [移動基幹](movement-core.md)。
- `dist/terrain.js`：地形・道・地名と静的頂点キャッシュ。描画・足元・カメラの高さを一致させる。
- `dist/island.js`：WebGL、固定60Hzの移動との接続、島民・環境音・実移動に基づく足音。
- `dist/index.html` / `dist/style.css`：開始画面、字幕、安全領域、キャッシュ更新付き読込。
- root `index.html` / manifest / assets：Pagesとホーム画面への入口。rootからdistへの相対経路を保つ。
- `tests/` の検査アクセスはローカル応答へだけ追加し、本番アセットに入れない。新しいゲーム仕様を独断で追加しない。

残課題をROADMAP、採用理由をDECISIONS、観測をQAまたは対応PRへ残す。トークン・個人チャットは保存しない。
過去の研究値・実機未計測の性能値を現行の保証にしない。

## 導入後に人間が行う管理画面設定

- **Settings → Actions**：`Nagi checks` を有効にし、PRで `rules` / `browser` が実際に成功することを確認。権限は `contents: read`。
- **Settings → Rules → Rulesets**：（自動操縦期の最新手順は [AUTOPILOT](AUTOPILOT.md) の7節。必須チェックは `rules` / `browser` / `gate`、Require branches to be up to date はオフ）main対象でActive、PR必須、force push禁止、削除制限、必須チェックを設定。成功したPRに表示される正確な `rules` / `browser` のチェック名を選ぶ。個人開発で取得できない他者承認数を必須にしない。利用プランと適用状態を確認し、失敗CIのPRがマージを制限されることを確認する。
- **Settings → Pages**：現行main / rootと `https://hane-san.github.io/ARPG-01-SkyrimStyle/` を維持し、マージ後の公開を確認。旧 `/ARPG/` と `/Koitototsukuru/` は404。追加の改名・表示名の移行は別工程。
- **Codex / Claude Code**：実repo、Node/Python/ブラウザ、実モデルと権限を確認。初回は手動でIssue→PRの受渡しを試す。
- **夜間Routineを導入する場合**：最初は1repoの未処理PR。権限・モデル・対象SHA・スケジュールを確認し、結果をPRへ残す。main直接pushを許可しない。マージは「自動操縦」の規程どおり。

文書・PRの作成だけで、保護設定やRoutineが有効になったとは扱わない。

## Claude Codeによる監督・夜間巡回

Codex/GPT等が作ったPRをClaude Codeが受け取るときの手順（競合→CI→差分監査→1件の記録コメント→人間待ち）と、夜間巡回の範囲は `.claude/skills/steward/SKILL.md`。クラウドのセッションでは `.claude/hooks/session-start.sh` がブラウザ検査の依存を用意する。承認・Settings変更はしない。マージは「自動操縦」の規程どおり。

明け方の巡回：毎日4:12（日本時間）に、専用セッション「明け方の監督巡回（独立監査担当）」が5つのリポジトリのPRを、このスキルの手順で見回る（2026-10-20 採用）。2026-11-14からは、マージ済みPRの事後監査とstuckの救出が主な役目（スキルの「明け方の巡回」）。
