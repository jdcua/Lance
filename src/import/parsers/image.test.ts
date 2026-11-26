import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseImage } from './image';

class StubImage {
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
}

let images: StubImage[] = [];

beforeEach(() => {
  images = [];
  vi.stubGlobal(
    'Image',
    class extends StubImage {
      constructor() {
        super();
        images.push(this);
      }
    },
  );
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:stub');
      static revokeObjectURL = vi.fn();
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,STUB');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function imageFile(): File {
  return new File([new Uint8Array(1024 * 1024)], 'shot.png', { type: 'image/png' });
}

describe('image import detection', () => {
  it('classifies a loaded image as an attachment and reports its dimensions', async () => {
    const pending = parseImage(imageFile());
    const img = images[0];
    img.width = 1920;
    img.height = 1080;
    img.onload?.();

    const result = await pending;
    expect(result.fileType).toBe('image');
    expect(result.detectedEntity).toBe('attachment');
    expect(result.confidence).toBe(1);
    expect(result.preview.imageDimensions).toEqual({ width: 1920, height: 1080 });
    expect(result.preview.summary).toContain('1920×1080px');
    expect(result.preview.summary).toContain('1.00 MB');
    expect(result.preview.imageDataUrl).toBe('data:image/jpeg;base64,STUB');
  });

  it('still classifies an image when no preview can be generated', async () => {
    const pending = parseImage(imageFile());
    images[0].onerror?.();

    const result = await pending;
    expect(result.detectedEntity).toBe('attachment');
    expect(result.preview.summary).toBe('Image file · could not generate preview');
    expect(result.preview.imageDataUrl).toBeUndefined();
  });
});
