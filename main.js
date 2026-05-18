const startButton = document.querySelector("#start-ar");
const closeButton = document.querySelector("#close-ar");
const statusText = document.querySelector("#status");
const xrUi = document.querySelector("#xr-ui");
const orientationLabel = document.querySelector("#orientation-label");

let xrSession = null;
let gl = null;

function setStatus(message) {
  statusText.textContent = message;
}

function updateOrientationLabel() {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  document.body.dataset.orientation = isPortrait ? "portrait" : "landscape";
  orientationLabel.textContent = `orientation: ${document.body.dataset.orientation}`;
}

async function init() {
  updateOrientationLabel();
  window.addEventListener("resize", updateOrientationLabel);
  screen.orientation?.addEventListener?.("change", updateOrientationLabel);

  if (!("xr" in navigator)) {
    setStatus("このブラウザは WebXR に対応していません。");
    startButton.disabled = true;
    return;
  }

  const supported = await navigator.xr.isSessionSupported("immersive-ar");
  if (!supported) {
    setStatus("immersive-ar が利用できません。Android Chrome + ARCore 対応端末で確認してください。");
    startButton.disabled = true;
    return;
  }

  setStatus("WebXR AR を開始できます。");
}

async function startAR() {
  try {
    xrSession = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: xrUi },
    });

    xrSession.addEventListener("end", onSessionEnded);

    xrUi.classList.remove("hidden");
    updateOrientationLabel();

    const canvas = document.createElement("canvas");
    gl = canvas.getContext("webgl", { xrCompatible: true, alpha: true });

    await xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(xrSession, gl),
    });

    const referenceSpace = await xrSession.requestReferenceSpace("local");
    xrSession.requestAnimationFrame((time, frame) => onXRFrame(time, frame, referenceSpace));
  } catch (error) {
    console.error(error);
    setStatus(`AR開始に失敗しました: ${error.message}`);
  }
}

function onXRFrame(time, frame, referenceSpace) {
  const session = frame.session;
  session.requestAnimationFrame((t, f) => onXRFrame(t, f, referenceSpace));

  const pose = frame.getViewerPose(referenceSpace);
  if (!pose) return;

  gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function onSessionEnded() {
  xrSession = null;
  xrUi.classList.add("hidden");
  setStatus("ARを終了しました。");
}

startButton.addEventListener("click", startAR);
closeButton.addEventListener("click", () => xrSession?.end());

document.querySelector("#primary-action").addEventListener("click", () => {
  console.log("primary action clicked");
  orientationLabel.textContent = `撮影ボタン: ${document.body.dataset.orientation}`;
});

document.querySelector("#secondary-action").addEventListener("click", () => {
  console.log("secondary action clicked");
  orientationLabel.textContent = `切替ボタン: ${document.body.dataset.orientation}`;
});

init();
