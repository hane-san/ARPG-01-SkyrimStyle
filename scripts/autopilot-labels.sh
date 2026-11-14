#!/usr/bin/env bash
# 自動操縦のラベルを作る（既にあれば色と説明を更新）。使い方：bash scripts/autopilot-labels.sh owner/repo
set -euo pipefail
repo="${1:?owner/repo を指定}"
mk() { gh label create "$1" -R "$repo" --color "$2" --description "$3" --force; }
mk lane/auto      0e8a16 "low・medium：自動操縦の見回りが実装"
mk lane/claude    5319e7 "high：はねさんが Claude Code に直接頼む"
mk needs-info     fbca04 "実装に足る情報がない（質問中）"
mk proposal       c5def5 "提案・相談。実装もマージもしない"
mk in-progress    1d76db "見回りが実装中（同時に1件）"
mk stuck          b60205 "自動では進められない。人の確認が必要"
mk ci-asked       d4c5f9 "CIの修正を一度依頼済み"
mk conflict-asked d4c5f9 "競合の解消を一度依頼済み"
mk revert         e99695 "main を戻すPR"
mk external       ededed "許可リスト外の作成者。自動では扱わない"
mk autopilot-stop d93f0b "開いている間、自動操縦は新しい実装をしない（非常停止）"
mk hold           000000 "止めたいPR・Issue（実装もマージもしない）"
