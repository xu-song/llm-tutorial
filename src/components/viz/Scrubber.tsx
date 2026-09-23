"use client";

import { useEffect, useRef, useState } from "react";

// 通用时间轴 scrubber:一条可拖动的进度轨 + 播放/暂停 + 逐帧步进。
// 与自动播放动画的区别:可以拖回任意一帧回看(scrub),不只是单向播放。
// 交互组件统一复用(全站首个 scrubber 原语)。

interface ScrubberProps {
  /** 当前帧(0-based) */
  value: number;
  /** 总帧数(帧范围 0..frames-1) */
  frames: number;
  onChange: (v: number) => void;
  /** 播放间隔 ms */
  intervalMs?: number;
  /** 左侧标签 */
  label?: string;
  /** 把帧号格式化成显示文本 */
  format?: (v: number) => string;
}

export default function Scrubber({
  value,
  frames,
  onChange,
  intervalMs = 120,
  label = "时间轴",
  format,
}: ScrubberProps) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // 用 ref 持有最新 value,避免把 value 放进 effect 依赖导致定时器反复重建
  const valRef = useRef(value);
  valRef.current = value;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  };

  const toggle = () => {
    if (playing) return stop();
    // 播完了从头开始
    if (valRef.current >= frames - 1) onChange(0);
    setPlaying(true);
    timer.current = setInterval(() => {
      const next = valRef.current + 1;
      if (next >= frames - 1) {
        onChange(frames - 1);
        stop();
      } else {
        onChange(next);
      }
    }, intervalMs);
  };

  // 卸载 / frames 变化时清理
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const step = (d: number) => {
    stop();
    onChange(Math.max(0, Math.min(frames - 1, value + d)));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
        <span className="font-mono font-medium text-emerald-700">
          {format ? format(value) : `${value + 1} / ${frames}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => step(-1)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="上一帧"
        >
          ◀
        </button>
        <button
          onClick={toggle}
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-500"
        >
          {playing ? "暂停" : "▶ 播放"}
        </button>
        <button
          onClick={() => step(1)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="下一帧"
        >
          ▶
        </button>
        <input
          type="range"
          min={0}
          max={frames - 1}
          step={1}
          value={value}
          onChange={(e) => {
            stop();
            onChange(parseInt(e.target.value, 10));
          }}
          className="w-full accent-emerald-600"
        />
      </div>
    </div>
  );
}
