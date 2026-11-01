import { usePhotoSrc } from '@/hooks/usePhotoSrc';
import type { Plant } from '@/types';

interface Props {
  plant: Plant;
  size?: number;
  className?: string;
}

// The plant's photo in a circle ringed with its color, or a colored badge with its first letter.
export default function PlantIcon({ plant, size = 40, className = '' }: Props) {
  const { src } = usePhotoSrc(plant.photo_filename);
  const style = { width: size, height: size, borderColor: plant.color, backgroundColor: plant.color };

  if (src) {
    return (
      <img
        src={src}
        alt={plant.name}
        draggable={false}
        className={`rounded-full object-cover border-[3px] shadow-sm select-none ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shadow-sm select-none ${className}`}
      style={{ ...style, fontSize: size * 0.45 }}
    >
      {plant.name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}
