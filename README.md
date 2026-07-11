# 脱出ゲーム (JSON駆動)

`docs/json-spec.md`（全体構造）と `docs/object-spec.md`（Object定義。states/defaultStateベース）の
仕様に従った、JSON駆動の脱出ゲームエンジン実装。
部屋・オブジェクト・イベントの追加は `src/data/game.json` の編集のみで行い、
スキーマ自体 (`src/engine/types.ts`) は変更しない。

## アーキテクチャ

- `src/engine/types.ts` — JSON仕様に対応する型定義（Game / Stage / Room / GameObject / ObjectState / Trigger / Condition / Event / Item）
- `src/engine/conditions.ts` — Condition評価ロジック（hasItem / selectedItem / objectState / globalState / visible / enabled / inputValue と6種類のoperator）
- `src/engine/GameEngine.ts` — ゲーム進行ロジック本体。オブジェクトはRoom内でフラットに保持し、`states[state].children` はID参照として解決する（いずれかのStateのchildrenに現れるIDはRoom直下には表示されない）。Trigger/Eventの直列実行・ロック制御・watchStateの状態変化監視（false→true遷移でのみ発火するエッジトリガー、現在のStateのtriggersのみを評価）・ナビゲーションスタック・インベントリ・グローバル状態を管理する
- `src/engine/useGameEngine.ts` — `useSyncExternalStore` によるReact連携
- `src/components/*` — JSONを描画するだけのコンポーネント群。個別の謎解きロジックは一切持たない
- `src/data/game.json` — サンプルシナリオ（本棚→鍵→引き出し→メモ→ダイヤル錠→脱出、代表的なtrigger/condition/eventを一通り使用）

## 実行

```sh
npm install
npm run dev        # 開発サーバ
npm run build       # 型チェック + ビルド
npm test            # engineのユニットテスト (vitest)
```

## 新しい部屋・オブジェクトの追加方法

`src/data/game.json` に、仕様書の型に沿ったJSONを追記するだけでよい。
Reactコンポーネントやengineのコード変更は不要。
