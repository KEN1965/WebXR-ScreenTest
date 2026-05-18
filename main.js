// HTML要素取得
const startButton = document.getElementById("start-ar");
const ui = document.getElementById("ui");
const debug = document.getElementById("debug-orientation");
const versionLabel = document.getElementById("version-label");
const distanceLabel = document.getElementById("distance-label");

//WebXR描画用canvasを取得
const canvas = document.getElementById("xr-canvas");

//webXR用のwebGLコンテキストを作成
const gl = canvas.getContext("webgl", {
  xrCompatible: true,
  alpha: true,
});

//hit-testをするために追加
let xrSession = null;
let xrReferenceSpace = null;
let viewerSpace = null;
let hitTestSource = null;

let floorDetected = false;
let floorDistance = null;

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
        //hit-test
        // requiredFeatures: ["hit-test"],
        optionalFeatures: ["hit-test","dom-overlay"],

        domOverlay: {
          root: ui
        }
      }
    );

    console.log("AR開始", session);

    xrSession = session;
  

    //webglをwebxrで使える状態にする
    await gl.makeXRCompatible();

    //webxrの描出レイヤーを作成する
    session.updateRenderState({
      baseLayer: new XRWebGLLayer(session, gl)
    });

      // AR空間の基準
      xrReferenceSpace = await session.requestReferenceSpace("local");

      // スマホ視点の基準
      viewerSpace = await session.requestReferenceSpace("viewer");

      // スマホ中心から前方に向けてhit-testする
      hitTestSource = await session.requestHitTestSource({
        space: viewerSpace,
      });

    //AR開始後に向きを再判定
    updateOrientationByScreenSize();

      // AR開始後の状態にする
    document.body.dataset.arStarted = "true";
    // AR開始ボタンを非表示にする
    startButton.style.display = "none";
    versionLabel.style.display = "none";

        //webxrの描画ループ開始
    session.requestAnimationFrame(onXRFrame);

  } catch (error) {

    console.error(error);

    alert(`AR開始失敗: ${error.name}\n${error.message}`);
  }
});


//webxr描画ループ
function onXRFrame(time, frame) {
  const session = frame.session;


  //次のフレームも描画する
  session.requestAnimationFrame(onXRFrame);

  if (!hitTestSource || !xrReferenceSpace) return;

  const hitTestResults = frame.getHitTestResults(hitTestSource);

  if (hitTestResults.length > 0) {
    const hit = hitTestResults[0];

    const hitPose = hit.getPose(xrReferenceSpace);
    const viewerPose = frame.getViewerPose(xrReferenceSpace);

    if (!hitPose || !viewerPose) return;

    floorDetected = true;
    document.body.dataset.floorDetected = "true";

    const floorY = hitPose.transform.position.y;
    const phoneY = viewerPose.transform.position.y;

    floorDistance = Math.abs(phoneY - floorY);

    distanceLabel.textContent = `${floorDistance.toFixed(2)} m`;

    console.log("floor distance:", floorDistance.toFixed(2), "m");
  } else {
    floorDetected = false;
    document.body.dataset.floorDetected = "false";

    distanceLabel.textContent = "-- m";

  }

  
}
