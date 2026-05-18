# WebXR Screen Test v2

Android Chrome の WebXR AR で、スマホの縦横を自動判定してUI配置を切り替えるサンプルです。

## 変更点

- 「切替」ボタンで向きを変える仕様ではありません。
- `screen.orientation` / `window.orientation` / viewport サイズから自動判定します。
- `body[data-screen-orientation="portrait"]` と `body[data-screen-orientation="landscape"]` でCSSを切り替えます。
- ボタン名を「切替」から「メニュー」に変更しました。

## GitHub Pages

リポジトリ直下に以下を置いてください。

- index.html
- style.css
- main.js
- README.md

Settings > Pages > Deploy from a branch > main / root を選択すると公開できます。

## 確認ポイント

AR開始後、スマホを縦・横に回転すると、右上の表示が `portrait` / `landscape` に変わります。
変われば、CSSのレイアウトも自動で切り替わっています。
