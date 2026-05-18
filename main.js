// HTML要素取得
const startButton = document.getElementById("start-ar");
const ui = document.getElementById("ui");
const debug = document.getElementById("debug-orientation");

// 現在の向き
let currentOrientation = null;

// UI向きをセット
function setScreenOrientation(orientation) {

  if (currentOrientation === orientation) return;

  currentOrientation = orientation;

  // body属性変更
  document.body.dataset.screenOrientation = orientation;

  // デバッグ表示更新
  debug.textContent = orientation;

  console.log("screen orientation:", orientation);
}

// 通常ブラウザ判定
function updateOrientationByScreenSize() {

  const width = window.innerWidth;
  const height = window.innerHeight;

  if (width > height) {
    setScreenOrientation("landscape");
  } else {
    setScreenOrientation("portrait");
  }
}

// スマホセンサー判定
function handleDeviceOrientation(event) {

  const gamma = event.gamma;
  const beta = event.beta;

  if (gamma === null || beta === null) return;

  const isLandscape = Math.abs(gamma) > 45;

  if (isLandscape) {
    setScreenOrientation("landscape");
  } else {
    setScreenOrientation("portrait");
  }
}

// 初期化
updateOrientationByScreenSize();

// 画面サイズ変化
window.addEventListener(
  "resize",
  updateOrientationByScreenSize
);

// センサーイベント
window.addEventListener(
  "deviceorientation",
  handleDeviceOrientation
);

// AR開始
startButton.addEventListener("click", async () => {

  if (!navigator.xr) {
    alert("WebXR未対応です");
    return;
  }

  try {

    const session = await navigator.xr.requestSession(
      "immersive-ar",
      {

        optionalFeatures: ["dom-overlay"],

        domOverlay: {
          root: ui
        }
      }
    );

    console.log("AR開始", session);

    updateOrientationByScreenSize();

  } catch (error) {

    console.error(error);

    alert("AR開始失敗");
  }
});
