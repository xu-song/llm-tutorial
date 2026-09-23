"use client";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** 数值显示精度 */
  decimals?: number;
  /** 数值后缀,如单位 */
  suffix?: string;
}

/** 通用滑块:左侧标签,右侧当前值,下方滑轨。交互组件统一复用。 */
export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  decimals = 2,
  suffix = "",
}: SliderProps) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
        <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">
          {value.toFixed(decimals)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-600"
      />
    </label>
  );
}
