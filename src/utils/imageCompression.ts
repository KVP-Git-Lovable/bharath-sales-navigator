/**
 * Client-side image compression utility.
 * Compresses images to ~50% size with a max of 600KB.
 * Non-image files (e.g. PDFs) are returned unchanged.
 */

const MAX_DIMENSION = 1200;
const MAX_FILE_SIZE = 600 * 1024; // 600KB
const QUALITY_STEPS = [0.6, 0.4, 0.3, 0.2];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getScaledDimensions(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }
  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Compress an image File or Blob for upload.
 * - Skips non-image types (returns as-is)
 * - Scales down to max 1200px
 * - Iteratively lowers JPEG quality to stay ≤ 600KB
 */
export async function compressImageForUpload(
  file: File | Blob,
  options?: { maxDimension?: number; maxSizeBytes?: number }
): Promise<Blob> {
  const maxDim = options?.maxDimension ?? MAX_DIMENSION;
  const maxSize = options?.maxSizeBytes ?? MAX_FILE_SIZE;

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Already small enough? Skip compression
  if (file.size <= maxSize) {
    return file;
  }

  try {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    URL.revokeObjectURL(url);

    const { width, height } = getScaledDimensions(img.width, img.height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    // Try each quality level until under max size
    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= maxSize) {
        console.log(`[ImageCompression] Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB (quality=${quality}, ${width}x${height})`);
        return blob;
      }
    }

    // If still too large after lowest quality, return the smallest we got
    const finalBlob = await canvasToBlob(canvas, 0.15);
    console.log(`[ImageCompression] Final compress: ${(file.size / 1024).toFixed(0)}KB → ${(finalBlob.size / 1024).toFixed(0)}KB (quality=0.15)`);
    return finalBlob;
  } catch (error) {
    console.error('[ImageCompression] Compression failed, using original:', error);
    return file;
  }
}
