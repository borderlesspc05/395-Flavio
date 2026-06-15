const MAX_EDGE = 720;
const JPEG_QUALITY = 0.88;

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = src;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('ENCODE_FAILED'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

export async function prepareProfileImageDataUrl(file: File): Promise<string> {
  const type = file.type?.toLowerCase() || '';
  const isImage = type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);

  if (!isImage) {
    throw new Error('INVALID_TYPE');
  }

  if (file.size <= 350_000 && (type === 'image/jpeg' || type === 'image/jpg')) {
    return readFileAsDataUrl(file);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height, 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ENCODE_FAILED');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToJpegBlob(canvas);
  return readFileAsDataUrl(blob);
}

function profilePhotoCacheKey(userId: string) {
  return `mm.profile.photo.${userId}`;
}

export function readCachedProfilePhoto(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(profilePhotoCacheKey(userId));
}

export function writeCachedProfilePhoto(userId: string, photoURL: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(profilePhotoCacheKey(userId), photoURL);
}

export function clearCachedProfilePhoto(userId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(profilePhotoCacheKey(userId));
}
