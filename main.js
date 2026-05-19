// =========================================
// HTML要素取得
// =========================================

// AR開始ボタン
const startButton =
  document.getElementById("start-ar");

// version表示
const versionLabel =
  document.getElementById("version-label");

// AR中UI
const ui =
  document.getElementById("ui");

// portrait / landscape表示
const debug =
  document.getElementById("debug-orientation");

// 距離表示
const distanceLabel =
  document.getElementById("distance-label");

// WebXR描画用canvas
const canvas =
  document.getElementById("xr-canvas");


// =========================================
// WebGLコンテキスト作成
// =========================================

// WebXRで使用するWebGL
const gl = canvas.getContext("webgl", {

  // WebXR互換
  xrCompatible: true,

  // 背景透明
  alpha: true,
});


// =========================================
// WebXR関連変数
// =========================================

// XR空間の基準
let xrReferenceSpace = null;

// スマホ視点
let viewerSpace = null;

// hit-test用
let hitTestSource = null;


// =========================================
// 画面向き管理
// =========================================

// 現在の向き
let currentOrientation = null;


// =========================================
// UI向きを更新
// =========================================

function setScreenOrientation(
  orientation
) {

  // 同じ向きなら何もしない
  if (
    currentOrientation === orientation
  ) {
    return;
  }

  // 現在向きを更新
  currentOrientation = orientation;

  // body属性更新
  // CSSで使う
  document.body.dataset.screenOrientation =
    orientation;

  // 左上表示更新
  debug.textContent = orientation;

  console.log(
    "orientation:",
    orientation
  );
}


// =========================================
// 画面サイズから向きを判定
// =========================================

function updateOrientationByScreenSize() {

  // 横幅
  const width = window.innerWidth;

  // 高さ
  const height = window.innerHeight;

  // 横長ならlandscape
  const isLandscape =
    width > height;

  setScreenOrientation(
    isLandscape
      ? "landscape"
      : "portrait"
  );
}


// =========================================
// スマホセンサーで向きを判定
// =========================================

function handleDeviceOrientation(
  event
) {

  // 左右傾き
  const gamma = event.gamma;

  // 値がない場合は終了
  if (gamma === null) {
    return;
  }

  // 45度以上なら横画面
  const isLandscape =
    Math.abs(gamma) > 45;

  setScreenOrientation(
    isLandscape
      ? "landscape"
      : "portrait"
  );
}


// =========================================
// 初期向き設定
// =========================================

// 初回判定
updateOrientationByScreenSize();

// 画面サイズ変更
window.addEventListener(
  "resize",
  updateOrientationByScreenSize
);

// センサー変化
window.addEventListener(
  "deviceorientation",
  handleDeviceOrientation
);


// =========================================
// AR開始
// =========================================

startButton.addEventListener(
  "click",
  async () => {

    // WebXR対応確認
    if (!navigator.xr) {

      alert("WebXR未対応です");

      return;
    }

    try {

      // =========================
      // WebXRセッション開始
      // =========================

      const session =
        await navigator.xr.requestSession(
          "immersive-ar",
          {

            // 使用する機能
            optionalFeatures: [

              // 床検出
              "hit-test",

              // HTML UI表示
              "dom-overlay"
            ],

            // DOM Overlay root
            domOverlay: {
              root: ui
            }
          }
        );

      console.log(
        "AR開始",
        session
      );


      // =========================
      // AR開始状態
      // =========================

      // UI表示
      document.body.dataset.arStarted =
        "true";

      // 床未検出状態
      document.body.dataset.floorDetected =
        "false";

      // AR開始ボタン非表示
      startButton.style.display =
        "none";

      // version非表示
      versionLabel.style.display =
        "none";


      // =========================
      // WebGLをWebXR互換にする
      // =========================

      await gl.makeXRCompatible();


      // =========================
      // WebXR描画レイヤー作成
      // =========================

      session.updateRenderState({

        baseLayer:
          new XRWebGLLayer(
            session,
            gl
          )
      });


      // =========================
      // AR空間基準
      // =========================

      xrReferenceSpace =
        await session.requestReferenceSpace(
          "local"
        );


      // =========================
      // スマホ視点
      // =========================

      viewerSpace =
        await session.requestReferenceSpace(
          "viewer"
        );


      // =========================
      // hit-test作成
      // =========================

      try {

        hitTestSource =
          await session.requestHitTestSource({

            // スマホ中心から探索
            space: viewerSpace,
          });

      } catch (error) {

        console.warn(
          "hit-test作成失敗",
          error
        );

        distanceLabel.textContent =
          "hit-test未使用";
      }


      // =========================
      // 向き更新
      // =========================

      updateOrientationByScreenSize();


      // =========================
      // 描画ループ開始
      // =========================

      session.requestAnimationFrame(
        onXRFrame
      );

    } catch (error) {

      console.error(error);

      alert(
        `AR開始失敗:
${error.name}
${error.message}`
      );
    }
  }
);


// =========================================
// WebXR描画ループ
// =========================================

function onXRFrame(
  time,
  frame
) {

  // XRSession取得
  const session =
    frame.session;

  // 次フレーム予約
  session.requestAnimationFrame(
    onXRFrame
  );


  // =====================================
  // hit-test準備未完了
  // =====================================

  if (
    !hitTestSource ||
    !xrReferenceSpace
  ) {

    // 距離表示初期化
    distanceLabel.textContent =
      "-- m";

    // 床未検出
    document.body.dataset.floorDetected =
      "false";

    return;
  }


  // =====================================
  // hit-test取得
  // =====================================

  const hitTestResults =
    frame.getHitTestResults(
      hitTestSource
    );


  // =====================================
  // 床未検出
  // =====================================

  if (
    hitTestResults.length === 0
  ) {

    // ガイド表示状態
    document.body.dataset.floorDetected =
      "false";

    // 距離初期化
    distanceLabel.textContent =
      "-- m";

    return;
  }


  // =====================================
  // 床検出成功
  // =====================================

  // 最初のhit
  const hit =
    hitTestResults[0];

  // hit位置
  const hitPose =
    hit.getPose(
      xrReferenceSpace
    );

  // スマホ位置
  const viewerPose =
    frame.getViewerPose(
      xrReferenceSpace
    );

  // poseが無ければ終了
  if (
    !hitPose ||
    !viewerPose
  ) {
    return;
  }


  // =====================================
  // 床高さ取得
  // =====================================

  // 床位置Y
  const floorY =
    hitPose.transform.position.y;

  // スマホ位置Y
  const phoneY =
    viewerPose.transform.position.y;


  // =====================================
  // 距離計算
  // =====================================

  const distance =
    Math.abs(
      phoneY - floorY
    );


  // =====================================
  // UI更新
  // =====================================

  // 距離表示
  distanceLabel.textContent =
    `${distance.toFixed(2)} m`;

  // 床検出済み
  document.body.dataset.floorDetected =
    "true";
}