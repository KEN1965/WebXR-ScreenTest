const startButton = document.querySelector("#start-ar");
const closeButton = document.querySelector("#close-ar");
const statusText = document.querySelector("#status");
const xrUi = document.querySelector("#xr-ui");
const orientationLabel = document.querySelector("#orientation-label");

let xrSession = null;
let gl = null;
let lastOrientation = "unknown";

function setStatus(message) {
  statusText.textContent = message;
}

function getScreenOrientation() {
  // WebXR中は CSS の @media (orientation) が期待通り更新されない端末があるため、
  // screen.orientation / window.orientation / viewport size の順で実画面の向きを判定する。
  const screenType = screen.orientation?.type || "";
  if (screenType.includes("landscape")) return "landscape";
  if (screenType.includes("portrait")) return "portrait";

  if (typeof window.orientation === "number") {
    return Math.abs(window.orientation) === 90 ? "landscape" : "portrait";
  }

  const viewport = window.visualViewport;
  const width = viewport?.width || window.innerWidth;
  const height = viewport?.height || window.innerHeight;
  return width > height ? "landscape" : "portrait";
}

function applyOrientationLayout() {
  const orientation = getScreenOrientation();
  document.body.dataset.screenOrientation = orientation;

  const viewport = window.visualViewport;
  const width = Math.round(viewport?.width || window.innerWidth);
  const height = Math.round(viewport?.height || window.innerHeight);
  const angle = screen.orientation?.angle ?? window.orientation ?? "-";

  orientationLabel.textContent = `${orientation} / ${width}x${height} / angle:${angle}`;
  lastOrientation = orientation;
}

async function init() {
  applyOrientationLayout();

  window.addEventListener("resize", applyOrientationLayout);
  window.visualViewport?.addEventListener("resize", applyOrientationLayout);
  screen.orientation?.addEventListener?.("change", applyOrientationLayout);
  window.addEventListener("orientationchange", () => {
    // Android Chromeでは回転直後に値が遅れて更新されることがある。
    applyOrientationLayout();
    setTimeout(applyOrientationLayout, 300);
  });

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
    applyOrientationLayout();

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

  // WebXRセッション中にも定期的に向きを確認する。
  const currentOrientation = getScreenOrientation();
  if (currentOrientation !== lastOrientation) {
    applyOrientationLayout();
  }

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
  console.log("撮影", document.body.dataset.screenOrientation);
});

document.querySelector("#secondary-action").addEventListener("click", () => {
  console.log("メニュー", document.body.dataset.screenOrientation);
});

init();
