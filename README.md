# WebXR-ScreenTest

Android Chrome で WebXR AR を開始し、スマホの縦向き・横向きで DOM Overlay のボタン配置を切り替える最小サンプルです。

## ファイル

- `index.html`: 画面と DOM Overlay の HTML
- `style.css`: 縦向き・横向きのボタン配置
- `main.js`: WebXR AR セッション開始、終了、向き判定

## 実機確認

WebXR AR は HTTPS または localhost が必要です。
Android 実機で確認する場合は、以下のどちらかがおすすめです。

### 方法A: GitHub Pages / Netlify / Vercel など HTTPS にアップロード

このフォルダをそのままアップロードして、Android Chrome で `index.html` を開きます。

### 方法B: PC でローカルサーバー + HTTPS トンネル

```bash
cd WebXR-ScreenTest
python3 -m http.server 8000
```

その後、ngrok などで HTTPS URL を発行して Android Chrome から開きます。

```bash
ngrok http 8000
```

## 確認ポイント

1. Android Chrome でページを開く
2. 「ARを開始」を押す
3. カメラが起動する
4. スマホを縦向き・横向きに回転する
5. 「撮影」「切替」ボタンの位置が変わる
