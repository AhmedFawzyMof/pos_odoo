import { ref, computed, onBeforeUnmount } from "vue";
import { BarcodeDetector } from "barcode-detector/pure";

export function useBarcodeScanner(options: {
  elementId: string;
  pauseDuration?: number;
  onScan: (barcode: string, done: () => void) => void;
  onError?: (error: string) => void;
}) {
  const { elementId, pauseDuration = 1800, onScan, onError } = options;

  let stream: MediaStream | null = null;
  let videoEl: HTMLVideoElement | null = null;
  let detector: BarcodeDetector | null = null;
  let animationId: number | null = null;
  let scanning = false;

  const isPaused = ref(false);
  const errorMessage = ref("");
  const zoomSupported = ref(false);
  const currentZoom = ref(1);
  const zoomMin = ref(1);
  const zoomMax = ref(1);

  const isActive = computed(() => scanning);

  const getVideoTrack = (): MediaStreamTrack | null => {
    return stream?.getVideoTracks()[0] ?? null;
  };

  const getErrorMessage = (err: any): string => {
    if (!window.isSecureContext) {
      return "يجب تشغيل هذا النظام عبر رابط آمن HTTPS لتفعيل الكاميرا.";
    }
    const name = err?.name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "تم رفض صلاحية الكاميرا. يرجى تفعيلها من إعدادات المتصفح.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "لم يتم العثور على كاميرا متوافقة.";
    }
    return `تعذر تشغيل الكاميرا: ${err?.message || err}`;
  };

  const checkZoomCapability = async () => {
    const track = getVideoTrack();
    if (!track) return;
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      zoom?: { min: number; max: number; step?: number };
    };
    if (capabilities?.zoom) {
      zoomSupported.value = true;
      zoomMin.value = capabilities.zoom.min;
      zoomMax.value = capabilities.zoom.max;
      currentZoom.value = capabilities.zoom.min;
    }
  };

  const applyZoom = async (value: number) => {
    const track = getVideoTrack();
    if (!track) return;
    await track.applyConstraints({
      advanced: [{ zoom: value }] as unknown as MediaTrackConstraintSet[],
    });
    currentZoom.value = value;
  };

  const playBeep = () => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // silent
    }
  };

  const resetPause = () => {
    isPaused.value = false;
  };

  const createDetector = async () => {
    try {
      detector = new BarcodeDetector({
        formats: [
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_128",
          "qr_code",
        ],
      });
    } catch {
      detector = null;
    }
  };

  const scanFrame = async () => {
    if (!scanning) return;
    if (!detector || !videoEl || isPaused.value) {
      animationId = requestAnimationFrame(scanFrame);
      return;
    }
    try {
      const codes = await detector.detect(videoEl);
      if (codes.length > 0 && !isPaused.value) {
        const code = codes[0];
        if (!code) return;
        isPaused.value = true;
        playBeep();
        onScan(code.rawValue, resetPause);
      }
    } catch {
      // detection error, retry next frame
    }
    animationId = requestAnimationFrame(scanFrame);
  };

  const start = async () => {
    errorMessage.value = "";
    try {
      const el = document.getElementById(elementId);
      if (!el) throw new Error("Element not found");
      if (!el.clientWidth) {
        el.style.minWidth = "300px";
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (err: any) {
        if (err.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        } else {
          throw err;
        }
      }

      videoEl = document.createElement("video");
      videoEl.srcObject = stream;
      videoEl.setAttribute("playsinline", "");
      videoEl.setAttribute("autoplay", "");
      videoEl.muted = true;
      videoEl.style.width = "100%";
      videoEl.style.height = "100%";
      videoEl.style.objectFit = "cover";

      el.innerHTML = "";
      el.appendChild(videoEl);

      await videoEl.play();

      await createDetector();

      scanning = true;
      animationId = requestAnimationFrame(scanFrame);

      await checkZoomCapability();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      errorMessage.value = msg;
      onError?.(msg);
      stop();
    }
  };

  const stop = () => {
    scanning = false;
    if (animationId != null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.remove();
      videoEl = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    detector = null;
    zoomSupported.value = false;
    currentZoom.value = 1;
  };

  onBeforeUnmount(() => {
    stop();
  });

  return {
    isActive,
    isPaused,
    errorMessage,
    zoomSupported,
    currentZoom,
    zoomMin,
    zoomMax,
    start,
    stop,
    applyZoom,
    getVideoTrack,
  };
}
