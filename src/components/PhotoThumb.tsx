import { usePhotoSrc } from '@/hooks/usePhotoSrc';
import type { Photo } from '@/types';

export default function PhotoThumb({ photo }: { photo: Photo }) {
  const { src, failed } = usePhotoSrc(photo.filename);

  if (failed) {
    return (
      <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
        Error
      </div>
    );
  }
  if (!src) {
    return <div className="w-20 h-20 bg-gray-200 rounded animate-pulse" />;
  }
  return <img src={src} alt={photo.original_name || 'Photo'} className="w-20 h-20 object-cover rounded" />;
}
