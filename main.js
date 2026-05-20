// =========================================
// HTML要素取得
// =========================================

// AR開始ボタン
const startButton = document.getElementById("start-ar");

// バージョン表示
const versionLabel = document.getElementById("version-label");

// AR中UI全体
const ui = document.getElementById("ui");

// portrait / landscape 表示
const orientationLabel = document.getElementById("debug-orientation");

// 距離表示
const distanceLabel = document.getElementById("distance-label");

// WebXR描画用canvas
const canvas = document.getElementById("xr-canvas");


// =========================================
// WebGLコンテキスト作成
// =========================================

const gl = canvas.getContext("webgl", {

  // WebXRで使えるようにする
  xrCompatible: true,

  // ARカメラ背景を活かすため透明
  alpha: true,
});


// =========================================
// WebXR / hit-test 用変数
// =========================================

// AR空間の基準
let xrReferenceSpace = null;

// スマホ視点の基準
let viewerSpace = null;

// hit-test用
let hitTestSource = null;


// =========================================
// 画面向き用変数
// =========================================

let currentOrientation = null;


// =========================================
// 画面向きをUIに反映
// =========================================

function setScreenOrientation(orientation) {

  // 同じ向きなら更新しない
  if (currentOrientation === orientation) {
    return;
  }

  currentOrientation = orientation;

  // CSS切り替え用
  document.body.dataset.screenOrientation = orientation;

  // 左上表示更新
  orientationLabel.textContent = orientation;

   console.log(
    "orientation:",
    orientation,
    "body:",
    document.body.dataset.screenOrientation,
    "w:",
    window.innerWidth,
    "h:",
    window.innerHeight
  );
}


// =========================================
// windowサイズで縦横判定
// =========================================

function updateOrientationByScreenSize() {

  const isLandscape = window.matchMedia("(orientation: landscape"),matches;

  setScreenOrientation(
    isLandscape ? "landscape" : "portrait"
  );
}


// =========================================
// スマホ傾きで縦横判定
// =========================================

function handleDeviceOrientation(event) {

  const gamma = event.gamma;

  if (gamma === null) {
    return;
  }

  // 横に倒すと gamma の絶対値が大きくなる
  const isLandscape = Math.abs(gamma) > 45;

  setScreenOrientation(
    isLandscape ? "landscape" : "portrait"
  );
}


// =========================================
// 初期化
// =========================================

// 初回の向き判定
updateOrientationByScreenSize();

// 画面サイズ変化
window.addEventListener(
  "resize",
  updateOrientationByScreenSize
);
// 画面サイズ変化
window.addEventListener(
  "orientationchange",
  updateOrientationByScreenSize
);

screen.orientation?.addEventListener(
  "change",
  updateOrientationByScreenSize
);

// =========================================
// AR開始ボタン
// =========================================

startButton.addEventListener("click", async () => {

  // WebXR対応確認
  if (!navigator.xr) {
    alert("WebXR未対応です");
    return;
  }

  try {

    // =========================
    // immersive-ar セッション開始
    // =========================

    const session = await navigator.xr.requestSession(
      "immersive-ar",
      {
        optionalFeatures: [
          "hit-test",
          "dom-overlay"
        ],

        domOverlay: {
          root: ui
        }
      }
    );

    console.log("AR開始", session);


    // =========================
    // AR開始後のUI状態
    // =========================

    document.body.dataset.arStarted = "true";
    document.body.dataset.floorDetected = "false";

    startButton.style.display = "none";
    versionLabel.style.display = "none";

    distanceLabel.textContent = "-- m";


    // =========================
    // WebGLをWebXR互換にする
    // =========================

    await gl.makeXRCompatible();


    // =========================
    // WebXR描画レイヤー作成
    // =========================

    session.updateRenderState({
      baseLayer: new XRWebGLLayer(
        session,
        gl
      )
    });


    // =========================
    // ReferenceSpace 作成
    // =========================

    xrReferenceSpace =
      await session.requestReferenceSpace("local");

    viewerSpace =
      await session.requestReferenceSpace("viewer");


    // =========================
    // hit-test source 作成
    // =========================

    try {

      hitTestSource =
        await session.requestHitTestSource({
          space: viewerSpace
        });

    } catch (error) {

      console.warn(
        "hit-test source作成失敗",
        error
      );

      hitTestSource = null;
      distanceLabel.textContent = "hit-test未使用";
    }


    // =========================
    // 向き再判定
    // =========================

    updateOrientationByScreenSize();


    // =========================
    // WebXR描画ループ開始
    // =========================

    session.requestAnimationFrame(onXRFrame);

  } catch (error) {

    console.error(error);

    alert(
      `AR開始失敗: ${error.name}\n${error.message}`
    );
  }
});


// =========================================
// WebXR描画ループ
// =========================================

function onXRFrame(time, frame) {

  const session = frame.session;

  // 次のフレームを予約
  session.requestAnimationFrame(onXRFrame);


  // =====================================
  // hit-test準備がまだの場合
  // =====================================

  if (!hitTestSource || !xrReferenceSpace) {

    document.body.dataset.floorDetected = "false";

    if (!hitTestSource) {
      distanceLabel.textContent = "-- m";
    }

    return;
  }


  // =====================================
  // hit-test 実行
  // =====================================

  const hitTestResults =
    frame.getHitTestResults(hitTestSource);


  // =====================================
  // 床未検出
  // =====================================

  if (hitTestResults.length === 0) {

    document.body.dataset.floorDetected = "false";
    distanceLabel.textContent = "-- m";

    return;
  }


  // =====================================
  // 床検出
  // =====================================

  const hit = hitTestResults[0];

  const hitPose =
    hit.getPose(xrReferenceSpace);

  const viewerPose =
    frame.getViewerPose(xrReferenceSpace);

  if (!hitPose || !viewerPose) {
    return;
  }


  // =====================================
  // 距離計算
  // =====================================

  const floorY =
    hitPose.transform.position.y;

  const phoneY =
    viewerPose.transform.position.y;

  const distance =
    Math.abs(phoneY - floorY);


  // =====================================
  // UI更新
  // =====================================

  distanceLabel.textContent =
    `${distance.toFixed(2)} m`;

  document.body.dataset.floorDetected =
    "true";
}