# 画像の入れ場所 (public/images)

ここに置いた PNG は、そのままサイトの `images/<name>.png` として配信されます
（GitHub Pages の base `/claudecode/` 込みで自動解決）。

- 画像の指定は `src/data/game.json` の **各オブジェクトの state の `image` フィールド**
  （と部屋の `background`、アイテムの `image`）に既に埋め込み済みです。
- ここに**同名の PNG を置くだけ**でプレースホルダから実画像に切り替わります。
- ファイルが無いオブジェクトは、これまで通り名前ラベルのプレースホルダ表示になります。

必要ファイル名の一覧は `docs/image-assets.md` を参照してください。
