import { PLANT_COLORS } from './colors';

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {PLANT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`w-6 h-6 rounded-full border-2 transition-transform ${
            value === color ? 'border-gray-800 scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
