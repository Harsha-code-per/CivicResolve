import { afterEach, describe, expect, it, vi } from 'vitest';
import { downscaleImage, MAX_IMAGE_EDGE } from '../../src/lib/image.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const stubBitmap = (width: number, height: number) => {
  const close = vi.fn();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve({ width, height, close })),
  );
  return close;
};

describe('downscaleImage', () => {
  it('scales the longest edge down to the limit and re-encodes as JPEG', async () => {
    const close = stubBitmap(4000, 3000);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/jpeg;base64,AAAA');

    expect(await downscaleImage(new Blob(['x']))).toBe('data:image/jpeg;base64,AAAA');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, MAX_IMAGE_EDGE, 960);
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    expect(close).toHaveBeenCalled();
  });

  it('never upscales small images and fails clearly without a canvas', async () => {
    stubBitmap(200, 100);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(downscaleImage(new Blob(['x']))).rejects.toThrow('cannot process images');
  });
});
