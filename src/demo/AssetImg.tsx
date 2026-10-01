import type { ImgHTMLAttributes } from 'react';
import { useAssetSrc } from './assetStore';

interface AssetImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  filePath: string | undefined;
}

/**
 * Image that understands trial storage: idb: paths resolve from IndexedDB
 * into blob URLs; anything else (desktop asset:// URLs) passes through.
 * Renders nothing until an idb: path resolves so callers keep showing
 * their icon/error fallbacks instead of a broken-image glyph.
 */
export default function AssetImg({ filePath, ...rest }: AssetImgProps) {
  const src = useAssetSrc(filePath);
  if (!src) return null;
  return <img src={src} {...rest} />;
}
