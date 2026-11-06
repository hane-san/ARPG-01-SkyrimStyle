# 検証手順と限界

対象SHA、環境、コマンド、成功/失敗/未実行と理由、実際の観測をPRへ残す。
実行方法は [DEVELOPMENT.md](DEVELOPMENT.md)。ゲームソースと検証コードを区別し、テスト用アクセスを本番配布しない。

## 現行チェック

| 確認 | コマンド | 範囲・限界 |
|---|---|---|
| 配布物生成 | `npm run build` | 単体HTML・dist manifest・既存アイコンを生成。意図しない生成差分を確認 |
| 構文・単体 | `npm run check` | 移動・継続加速・衝突・地形・空の計算。実機の感触を保証しない |
| 起動・操作 | `python3 tests/browser-check.py` | root→dist、開始画面、PC/タッチ、足音、解除・復帰、画面幅/安全領域 |
| 継続加速・capture | `python3 tests/controls-check.py` | 実タッチイベントと実移動処理。テスト応答へ一時アクセスを注入 |
| 広域周回 | `python3 tests/world-check.py` | 既存の北/東周回、渓谷近道、入江、実衝突・地名・描画 |
| 空の描画 | `python3 tests/sky-check.py` | 実シェーダーの画素、月の移動・消失・一周後復帰 |
| 縦持ち・旅のUI | `python3 tests/journey-check.py` | しおりの停止・音・フォーカス、通知の競合、風景の文、全字幕の下半分への非侵入、縦横6サイズ、実タッチ、動きを減らす設定 |
| 短いスモーク | `python3 tests/browser-check.py --smoke` | 起動・release・アイコン・保持入力・移動・停止。完全回帰の代用としない |

各検査はroot配信サーバーを自動起動し、終了時に停止する。ポートはbrowser:4173、controls:4178、world:4174、sky:4176。
journeyは4179を使う。browserだけは `--url http://127.0.0.1:<port>/` で起動済みの別サーバーへ向けられる。
既存devサーバーとのポート重複を避ける。生成されるPNGはgitignore対象でコミットしない。
`CHROMIUM_PATH` は既存Chromiumの実行パス。省略時は `/usr/bin/chromium`。Playwright導入はゲームの実行依存を増やさない。

## PR Actions

`.github/workflows/check.yml` の `Nagi checks` は全PRとpush mainで実行する。

- `rules`：Node 22でbuild、check、生成物の差分がないことを確認。
- `browser`：Python 3.12 / Playwright 1.57.0 / Chromiumで5本のブラウザ検査を実行。スクリーンショットは失敗時だけartifactへ保存。
- 権限は `contents: read`。配信・自動マージ・AIモデル呼出し・秘密情報を使う処理は追加しない。既存Pagesのmain / root配信を維持する。

必須化は、PRで実際に成功したチェック名を人間がRulesetへ登録してから。
監査のPASS/WARN/BLOCKは報告語であり、CI結果や人間の承認を置換しない。

## 導入前の現状確認（2026-10-18）

- 基準main：`80bfd81bdc4e2ca7259d3a643abbf32d0d8ab93f`。package v1.6.0、`nagi.release` は `2026-10-18-movement-core`。
- ローカルNode 24.19.0でbuild成功・生成差分なし、checkは34件成功。PR CIのNode 22結果は対象SHAで別途確認する。
- 既存ActionsはPages配信のみ。[main配信run 39086643706](https://github.com/hane-san/Koitototsukuru/actions/runs/39086643706) は成功。main `protected=false`。管理設定はこの導入で変更していない。
- 前回の初期監査結果・独立したゲーム確定仕様引継ぎMDは未提供。提供マニュアルと最新mainの資料・コード・テストで、本導入の範囲を確認した。

## 現在名の確認（2026-10-19）

- 現在の正本は `hane-san/ARPG-01-SkyrimStyle`。人間が承認・統合した最新main `6c0e59887742978e9a3e89e1cedaf1fba3840af5` を基準に検証する。現在の公開URLと旧案の区別は[移行記録](rename-preparation.md#確定した現在地2026-10-19)を参照。
- 既存の移行検査へ現在のrepoパスを追加。過去のパスも回帰用に保持するが、旧案のURLが公開済みという意味ではない。
- main保護のRulesetとチェック名は改名後も維持されている。以前の失敗CI実地確認の記録も保持する。新しいPRの対象SHAとCI結果はPR本文へ記録する。

## 人間の試遊・未検証

- 改名後の現在地（2026-10-18）：repoは `hane-san/ARPG`、公開 `/ARPG/` のroot/distは200、旧 `/Koitototsukuru/` は404。main `5343128a905b8c526c88b595ef42ea3bd96b73ca` の [CI](https://github.com/hane-san/ARPG/actions/runs/39137331077) と [Pages配信](https://github.com/hane-san/ARPG/actions/runs/39137387075) は成功。
- `tests/rename-check.py` は旧 `/Koitototsukuru/`、現在 `/ARPG/`、予定 `/hane-no-ARPG01/` をローカルで検査。予定URLが本番公開済みという意味ではない。完全回帰の末尾から実行する。
- 準備PR #6は統合済みだが、GitHub上に独立レビュー記録がない。外部での実施有無は未確認。[統合後レビュー](rename-review-handoff.md) とiPhone実機・ホーム画面再登録は残る。
- main保護の実地確認（2026-10-18）：[検証専用PR #9](https://github.com/hane-san/ARPG/pull/9) / [CI](https://github.com/hane-san/ARPG/actions/runs/39177212521) で、最新mainが直接の親・競合なし・draftでないPRのrules=failure / browser=success時にGitHubがblockedになることを確認。意図的なNodeテストの失敗をログでも確認し、PRを閉じた。マージを試みずmain SHA不変。独立監査・実機確認の代わりにはしない。

- iPhone Safari実機の操作感・酔い、FPS、長時間の熱や負荷、実際の聴感、ホーム画面起動。
- 開始→短い保持入力→全速/継続加速→旋回→離す/中断→停止→復帰、海岸・細い障害物、島民への接近を確認。
- ChromiumのCDPタッチ・ソフトウェアWebGLとiPhone実機を混同しない。CPU単体計測を端末のFPSに換算しない。
- 独立監査は別担当が対象SHAを記録し、人間が最終承認する。自己確認だけで独立監査済みにしない。
- lowの文書/CIのみのPRはゲーム試遊を省く理由と、文書・テンプレート・CIの人間確認を記録できる。

## 渡りの島（D021 / Issue #38）

`tests/watari.test.js`は旧島28地点の高さfixture、開始から全9地域・全道頂点へのBFS、全道の双方向、橋の接続と22歩往復・旋回、周回/枝道、10cm間隔の経路勾配とアニメーション中の視線高を検証する。

`python3 tests/watari-check.py`（port 4181）は本番の衝突・GridWalkerで開始からの到達、橋往復、全10経路の双方向、欄干からの横落下防止、通常キーでの橋上停止/旋回、9曲・空と帰還、自由移動の橋往復を検証。390×844の景観画像はgit対象外で、PR CIの `watari-portrait-evidence` artifactへ7日間保存する。実機の証明ではない。各実行のSHA・結果と独立監査はPRに残す。
