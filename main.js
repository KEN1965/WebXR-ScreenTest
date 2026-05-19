const startButton = document.getElementById("start-ar");
const versionLabel = document.getElementById("version-label");

const ui = document.getElementById("ui");
const debug = document.getElementById("debug-orientation");
const distanceLabel = document.getElementById("distance-label");

const canvas = document.getElementById("xr-canvas");
const gl = canvas.getContext("webgl", {
  xrCompatible: true,
  alpha: true,
});

let xrReferenceSpace = null;
let viewerSpace = null;
let hitTestSource = null;

let currentOrientation = null;

function setScreenOrientation(orientation) {
  if (currentOrientation === orientation) return;

  currentOrientation = orientation;
  document.body.dataset.screenOrientation = orientation;
  debug.textContent = orientation;
}

function updateOrientationByScreenSize() {
  const isLandscape = window.innerWidth > window.innerHeight;
  setScreenOrientation(isLandscape ? "landscape" : "portrait");
}

function handleDeviceOrientation(event) {
  if (event.gamma === null) return;

  const isLandscape = Math.abs(event.gamma) > 45;
  setScreenOrientation(isLandscape ? "landscape" : "portrait");
}

updateOrientationByScreenSize();

window.addEventListener("resize", updateOrientationByScreenSize);
window.addEventListener("deviceorientation", handleDeviceOrientation);

startButton.addEventListener("click", async () => {
  if (!navigator.xr) {
    alert("WebXR未対応です");
    return;
  }

  try {
    const session = await navigator.xr.requestSession("immersive-ar", {
      optionalFeatures: ["hit-test", "dom-overlay"],
      domOverlay: {
        root: ui,
      },
    });

    document.body.dataset.arStarted = "true";
    document.body.dataset.floorDetected = "false";

    startButton.style.display = "none";
    versionLabel.style.display = "none";

    await gl.makeXRCompatible();

    session.updateRenderState({
      baseLayer: new XRWebGLLayer(session, gl),
    });

    xrReferenceSpace = await session.requestReferenceSpace("local");
    viewerSpace = await session.requestReferenceSpace("viewer");

    try {
      hitTestSource = await session.requestHitTestSource({
        space: viewerSpace,
      });
    } catch (error) {
      console.warn("hit-test source作成失敗", error);
      distanceLabel.textContent = "hit-test未使用";
    }

    updateOrientationByScreenSize();

    session.requestAnimationFrame(onXRFrame);

  } catch (error) {
    console.error(error);
    alert(`AR開始失敗: ${error.name}\n${error.message}`);
  }
});

function onXRFrame(time, frame) {
  const session = frame.session;
  session.requestAnimationFrame(onXRFrame);

  if (!hitTestSource || !xrReferenceSpace) {
    distanceLabel.textContent = "-- m";
    document.body.dataset.floorDetected = "false";
    return;
  }

  const hitTestResults = frame.getHitTestResults(hitTestSource);

  if (hitTestResults.length === 0) {
    distanceLabel.textContent = "-- m";
    document.body.dataset.floorDetected = "false";
    return;
  }

  const hit = hitTestResults[0];
  const hitPose = hit.getPose(xrReferenceSpace);
  const viewerPose = frame.getViewerPose(xrReferenceSpace);

  if (!hitPose || !viewerPose) return;

  const floorY = hitPose.transform.position.y;
  const phoneY = viewerPose.transform.position.y;
  const distance = Math.abs(phoneY - floorY);

  distanceLabel.textContent = `${distance.toFixed(2)} m`;
  document.body.dataset.floorDetected = "true";
}