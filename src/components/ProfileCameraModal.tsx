import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';

interface ProfileCameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  title: string;
  hint: string;
  captureLabel: string;
  cancelLabel: string;
  deniedMessage: string;
  unavailableMessage: string;
}

export function ProfileCameraModal({
  open,
  onClose,
  onCapture,
  title,
  hint,
  captureLabel,
  cancelLabel,
  deniedMessage,
  unavailableMessage,
}: ProfileCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setError(null);
      setLoading(false);
      setCapturing(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(unavailableMessage);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play();
        }
      })
      .catch(() => {
        if (!cancelled) setError(deniedMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, deniedMessage, unavailableMessage, stopStream]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    setCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );
      if (!blob) return;
      const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopStream();
      await onCapture(file);
      onClose();
    } finally {
      setCapturing(false);
    }
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="profile-camera-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="profile-camera-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-camera-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="profile-camera-header">
          <div>
            <h2 id="profile-camera-title">{title}</h2>
            <p>{hint}</p>
          </div>
          <button type="button" className="profile-camera-close" onClick={handleClose} aria-label={cancelLabel}>
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="profile-camera-preview-wrap">
          {loading && (
            <div className="profile-camera-status">
              <Loader2 size={28} className="account-spin" aria-hidden />
            </div>
          )}
          {error ? (
            <div className="profile-camera-status profile-camera-status--error">
              <p>{error}</p>
            </div>
          ) : (
            <video ref={videoRef} className="profile-camera-preview" playsInline muted autoPlay />
          )}
        </div>

        <div className="profile-camera-actions">
          <button type="button" className="account-photo-btn account-photo-btn--ghost" onClick={handleClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="account-photo-btn account-photo-btn--primary"
            onClick={() => void handleCapture()}
            disabled={loading || capturing || !!error}
          >
            {capturing ? <Loader2 size={16} className="account-spin" aria-hidden /> : <Camera size={16} aria-hidden />}
            {captureLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
