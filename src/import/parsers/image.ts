/**
 * Image handler · generates thumbnails and metadata for image imports.
 * Images are always classified as 'attachment'.
 */

import type { ImportDetection } from '../../types';

const MAX_THUMB_SIZE = 200;

export async function parseImage(file: File): Promise<ImportDetection> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Generate thumbnail
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;

      if (w > MAX_THUMB_SIZE || h > MAX_THUMB_SIZE) {
        const ratio = Math.min(MAX_THUMB_SIZE / w, MAX_THUMB_SIZE / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      URL.revokeObjectURL(url);

      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

      resolve({
        file,
        fileType: 'image',
        detectedEntity: 'attachment',
        confidence: 1,
        preview: {
          summary: `Image: ${img.width}×${img.height}px · ${sizeMB} MB`,
          imageDataUrl,
          imageDimensions: { width: img.width, height: img.height },
        },
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        file,
        fileType: 'image',
        detectedEntity: 'attachment',
        confidence: 1,
        preview: {
          summary: `Image file · could not generate preview`,
        },
      });
    };

    img.src = url;
  });
}
