# 優先順位と未完了タスク

現行仕様は [DESIGN.md](DESIGN.md)、判断の根拠は [DECISIONS.md](DECISIONS.md)、検証は [QA.md](QA.md)。
以下の要検証・保留を、新しいゲーム機能の採用決定として扱わない。

## 開発運用の導入・残作業

1. [Issue #3](https://github.com/hane-san/Koitototsukuru/issues/3) / PR #4で契約・文書索引・テンプレート・PR CIをmainへ導入済み。統合後CI・Pagesも成功。
2. 人間がmainのRulesetへ必須チェックを設定し、APIで適用を確認済み。検証専用PR #9でrules=failure / browser=success時のGitHub blockedを実地確認後に閉じ、mainは不変。[現在地・根拠](rename-preparation.md#実際の改名後の現在地2026-10-18追記)。
3. Codex/SonnetのIssue受渡し、リスク別の独立監査と試遊記録を手動で試す。2026-10-20から、明け方4:12（日本時間）の監督巡回が専用セッションで動いている（[DECISIONS](DECISIONS.md)）。マージ・承認は人間のまま。
4. 改名準備PR #6は人間が統合済み。GitHub上で独立レビュー記録を確認できないため、[統合後レビュー](rename-review-handoff.md) と実機確認を残す。
5. 人間が参照修正PR #8を承認・統合し、repoを `ARPG-01-SkyrimStyle` へ改名済み。[現在地](rename-preparation.md#確定した現在地2026-10-19)へ参照と検査を合わせる。旧 `/ARPG/` と `/Koitototsukuru/` は404。現在URLのホーム画面登録と外部AIの対象repoを確認する。

## 優先する追加検証

- **iPhone実機**：小さい保持入力、全速・継続加速、旋回、指を離す/中断/二本指/背景復帰の停止と復帰、縦横の安全領域。
- **探索の快適さ**：既存の北・東の周回と近道、島民へ近づく速度、障害物・海岸で意図した方向へ進めるか。
- **実機の負荷**：広域地形・WebGL・描画省略・音のCPU/GPU負荷、長時間の体感。既存の単体計測とChromium模擬は実機性能の証明にしない。
- **配信**：人間によるmain統合後、Pagesの対象コミット、root→dist、release、manifest・アイコン・ホーム画面起動を確認する。

## 別工程・未採用の拡張

- 現在のrepoは `hane-san/ARPG-01-SkyrimStyle`、公開は `https://hane-san.github.io/ARPG-01-SkyrimStyle/`。以前のhane-no-*は旧案として保持し、追加改名しない。表示名切替は別の小PRで扱う。
- 戦闘・クエスト・セーブ・複雑な世界状態は未実装。採用判断と受入条件をIssueへ残してから別PRで扱う。
- 別作品の統合や、拡張性だけを目的とする大規模な抽象化は本導入に含めない。

## 渡りの島の追加後に確認すること（D021）

- iPhone実機で橋の発見しやすさ、坂での視線、片手の往復と長時間の描画・音声負荷を確認する。
- 9曲の音量と切替を実耳で評価する。ブラウザのスケジューラ/曲ID検査と区別する。
- 巨木・谷・塔・灯台を使った視界の切替、枝道と4周回の楽しさ、地域の密度を制作者の試遊で調整する。
