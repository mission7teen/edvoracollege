import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, RefreshCw, Volume2, VolumeX, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Student } from "@/lib/types";

interface QRScannerProps {
  roster: Student[];
  onStudentScanned: (studentId: string) => void;
  scannedIds: Set<string>;
  onClose: () => void;
}

export function QRScanner({ roster, onStudentScanned, scannedIds, onClose }: QRScannerProps) {
  const [cameras, setCameras] = useState<import("html5-qrcode").CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader-container";

  // Play synthetic scanner success beep using Web Audio API (cross-device compatible)
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // High-pitched cheerful beep
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); // quick decay

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (err) {
      console.warn("AudioContext beep failed to play:", err);
    }
  };

  // 1. Fetch available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Try to default to rear camera (contains "back" or "environment" in label)
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("environment") ||
              d.label.toLowerCase().includes("rear"),
          );
          setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
        } else {
          setError("No cameras found. Please check permissions or connect a camera.");
        }
      })
      .catch((err) => {
        console.error("Error getting cameras:", err);
        setError("Camera access is blocked or unsupported in this context.");
      });

    return () => {
      // Clean up scanning on unmount
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.warn("Error cleaning up scanner:", e));
      }
    };
  }, []);

  // Handle a scanned text code
  const handleDecodedText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Fast robust matching in batch roster
    // Can match: database UUID/id, studentId (e.g. EDV2024001), or prefixes like `edvora_stu:`
    let cleanValue = trimmed.replace(/^edvora_stu:/i, "");
    // If scanned content is an NFC/check-in URL (…/checkin/EDV-0001), extract the ID.
    const checkinMatch = cleanValue.match(/\/checkin\/([A-Za-z0-9_\-]+)/i);
    if (checkinMatch) cleanValue = checkinMatch[1];
    const matchingStudent = roster.find(
      (s) =>
        s.id === cleanValue ||
        s.studentId === cleanValue ||
        s.id === trimmed ||
        s.studentId === trimmed,
    );

    if (matchingStudent) {
      if (scannedIds.has(matchingStudent.id)) {
        // Already scanned in this session, provide light overlay hint
        return;
      }
      playBeep();
      onStudentScanned(matchingStudent.id);
      toast.success(`Present: ${matchingStudent.fullName} checked-in successfully!`, {
        duration: 3000,
        id: `scanned-${matchingStudent.id}`,
      });
    } else {
      // Show toast if student scanned is not in the current active batch roster
      toast.warning(
        `Scanned ID "${trimmed}" does not match any student in this active batch roster!`,
        {
          duration: 4000,
          id: `mismatch-${trimmed}`,
        },
      );
    }
  };

  // Setup callbacks ref to prevent webcam restarts on state mutation
  const scanCallbackRef = useRef(handleDecodedText);
  useEffect(() => {
    scanCallbackRef.current = handleDecodedText;
  });

  // 2. Start scanning when selectedCameraId or scanner activation changes
  useEffect(() => {
    if (!selectedCameraId) return;

    // Create unique instance if non-existent
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(containerId);
    }

    const startScanner = async () => {
      try {
        setError(null);
        // If already scanning on another stream, stop it first
        if (scannerRef.current?.isScanning) {
          await scannerRef.current.stop();
        }

        setIsScanning(true);
        await scannerRef.current?.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            scanCallbackRef.current(decodedText);
          },
          () => {
            // Frame-level scan failure/no QR detected (non-fatal, ignore to prevent spam)
          },
        );
      } catch (err: unknown) {
        console.error("Scanner failed to start:", err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(`Failed to start camera feed: ${errMsg}`);
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      // Safe cleanup when camera ID or component states change
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch((e) => console.warn("Error stopping scanner:", e));
      }
    };
  }, [selectedCameraId]);

  const cycleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  // List of students who are currently scanned/present or still unmarked/absent
  const scannedRosterItems = roster.filter((s) => scannedIds.has(s.id));
  const missingRosterItems = roster.filter((s) => !scannedIds.has(s.id));

  return (
    <div className="glass-card border border-primary/20 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      {/* Header bar */}
      <div className="bg-secondary/40 px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-pulse-green animate-pulse bg-success" />
          <span className="font-semibold text-sm">Live QR Attendance Session</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute beep" : "Unmute beep"}
            className="h-8 w-8 text-muted-foreground"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </Button>
          {cameras.length > 1 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={cycleCamera}
              title="Switch Camera"
              className="h-8 w-8 text-muted-foreground"
            >
              <RefreshCw size={16} />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Column: Video Scanner Feed */}
        <div className="md:col-span-7 flex flex-col gap-3">
          {/* Main camera window with scanning overlays */}
          <div className="relative aspect-square md:aspect-video rounded-xl bg-black border border-border flex items-center justify-center overflow-hidden">
            {/* The html5-qrcode element MUST have this exact id */}
            <div id={containerId} className="absolute inset-0 w-full h-full" />

            {/* Custom Scanning HUD overlay */}
            {isScanning && !error && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 border-[6px] border-black/40">
                {/* Overlay guides */}
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-md" />
                  <div className="w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-md" />
                </div>

                {/* Laser animation line */}
                <div className="w-full h-0.5 bg-primary/80 shadow-[0_0_8px_rgba(var(--primary-color),0.8)] animate-[bounce_2.5s_infinite] my-auto" />

                <div className="flex justify-between">
                  <div className="w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-md" />
                  <div className="w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-md" />
                </div>
              </div>
            )}

            {/* Error or initialization status state panels */}
            {error ? (
              <div className="p-4 text-center text-sm text-destructive z-20 flex flex-col items-center gap-2 max-w-[80%]">
                <AlertCircle size={32} />
                <p className="font-semibold">Camera Access Error</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            ) : !isScanning ? (
              <div className="p-4 text-center text-sm text-muted-foreground z-20 flex flex-col items-center gap-2">
                <Camera size={32} className="animate-pulse text-primary" />
                <p className="font-medium">Initializing camera stream...</p>
                <p className="text-xs">Please allow webcam access if prompted.</p>
              </div>
            ) : null}
          </div>

          {/* Camera Selector Dropdown */}
          {cameras.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 font-mono">Camera:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="w-full h-9 bg-card text-foreground px-3 py-1 text-xs rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${cameras.indexOf(c) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Column: Scanned list & status stats */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-secondary/20 p-3 rounded-xl border border-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Roster Scan Progress
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-success/10 border border-success/30 rounded-lg p-2 flex flex-col">
                <span className="text-success font-bold text-lg">{scannedRosterItems.length}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Present</span>
              </div>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 flex flex-col">
                <span className="text-destructive font-bold text-lg">
                  {missingRosterItems.length}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase">Absent (Missed)</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="text-xs font-semibold text-muted-foreground border-b border-border pb-1 mb-2 flex justify-between items-center">
              <span>Recently Checked-In ({scannedRosterItems.length})</span>
              <span className="font-mono text-[10px] text-primary">
                {Math.round((scannedRosterItems.length / (roster.length || 1)) * 100)}% present
              </span>
            </div>

            <div className="flex-1 max-h-[148px] md:max-h-[190px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {scannedRosterItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg flex flex-col items-center justify-center p-4">
                  <span className="animate-bounce">🔍</span>
                  <span className="mt-1">Waiting to scan student cards...</span>
                </div>
              ) : (
                scannedRosterItems
                  .slice()
                  .reverse()
                  .map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg border border-success/10 bg-success/5 animate-[fadeIn_0.3s_ease] text-xs"
                    >
                      <img
                        src={student.photoUrl}
                        alt=""
                        className="w-7 h-7 rounded-full bg-secondary object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-foreground">
                          {student.fullName}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">
                          {student.studentId}
                        </div>
                      </div>
                      <CheckCircle size={15} className="text-success shrink-0" />
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
