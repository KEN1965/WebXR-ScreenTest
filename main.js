// =========================================
// v0.0.4.19
// 縦UI / 横UI 分離版
// =========================================


// =========================================
// HTML要素取得
// =========================================

const startButton =
  document.getElementById("start-ar");

const versionLabel =
  document.getElementById("version-label");

const ui =
  document.getElementById("ui");

const canvas =
  document.getElementById("xr-canvas");

// 縦横それぞれの orientation 表示
const orientationLabels =
  document.querySelectorAll(".orientation-label");

// 縦横それぞれの距離表示
const distanceLabels =
  document.querySelectorAll(".distance-label");


// =========================================
// WebGLコンテキスト
// =========================================

const gl =
  canvas.getContext("webgl", {
    xrCompatible: true,
    alpha: true,
  });


// =========================================
// WebXR / hit-test 用変数
// =========================================

let xrReferenceSpace = null;
let viewerSpace = null;
let hitTestSource = null;


// =========================================
// 画面向き
// =========================================

let currentOrientation = null;


// =========================================
// orientation 表示を両方更新
// =========================================

function setOrientationText(text) {

  orientationLabels.forEach((label) => {
    label.textContent = text;
  });
}


// =========================================
// 距離表示を両方更新
// =========================================

function setDistanceText(text) {

  distanceLabels.forEach((label) => {
    label.textContent = text;
  });
}


// =========================================
// 画面向きを更新
// =========================================

function setScreenOrientation(orientation) {

  if (currentOrientation === orientation) {
    return;
  }

  currentOrientation = orientation;

  // CSS切り替え用
  document.body.dataset.screenOrientation =
    orientation;

  // 表示文字更新
  setOrientationText(orientation);

  console.log("orientation:", orientation);
}


// =========================================
// windowサイズで縦横判定
// =========================================

function updateOrientationByScreenSize() {

  const isLandscape =
    window.innerWidth > window.innerHeight;

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

  const isLandscape =
    Math.abs(gamma) > 45;

  setScreenOrientation(
    isLandscape ? "landscape" : "portrait"
  );
}


// =========================================
// 初期化
// =========================================

updateOrientationByScreenSize();

window.addEventListener(
  "resize",
  updateOrientationByScreenSize
);

window.addEventListener(
  "deviceorientation",
  handleDeviceOrientation
);


// =========================================
// AR開始
// =========================================

startButton.addEventListener("click", async () => {

  if (!navigator.xr) {
    alert("WebXR未対応です");
    return;
  }

  try {

    const session =
      await navigator.xr.requestSession(
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


    // AR開始後UI表示
    document.body.dataset.arStarted = "true";
    document.body.dataset.floorDetected = "false";

    startButton.style.display = "none";
    versionLabel.style.display = "none";

    setDistanceText("-- m");


    // WebGLをWebXR互換にする
    await gl.makeXRCompatible();


    // WebXR描画レイヤー作成
    session.updateRenderState({
      baseLayer:
        new XRWebGLLayer(session, gl)
    });


    // AR空間の基準
    xrReferenceSpace =
      await session.requestReferenceSpace("local");


    // スマホ視点
    viewerSpace =
      await session.requestReferenceSpace("viewer");


    // hit-test source 作成
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
      setDistanceText("hit-test未使用");
    }


    // AR開始後に向き再判定
    updateOrientationByScreenSize();


    // WebXR描画ループ開始
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

  const session =
    frame.session;

  session.requestAnimationFrame(onXRFrame);


  // hit-test準備前
  if (
    !hitTestSource ||
    !xrReferenceSpace
  ) {

    document.body.dataset.floorDetected =
      "false";

    setDistanceText("-- m");

    return;
  }


  // hit-test実行
  const hitTestResults =
    frame.getHitTestResults(hitTestSource);


  // 床未検出
  if (hitTestResults.length === 0) {

    document.body.dataset.floorDetected =
      "false";

    setDistanceText("-- m");

    return;
  }


  // 床検出
  const hit =
    hitTestResults[0];

  const hitPose =
    hit.getPose(xrReferenceSpace);

  const viewerPose =
    frame.getViewerPose(xrReferenceSpace);

  if (!hitPose || !viewerPose) {
    return;
  }


  // 床とスマホの高さ差
  const floorY =
    hitPose.transform.position.y;

  const phoneY =
    viewerPose.transform.position.y;

  const distance =
    Math.abs(phoneY - floorY);


  // UI更新
  setDistanceText(
    `${distance.toFixed(2)} m`
  );

  document.body.dataset.floorDetected =
    "true";
}