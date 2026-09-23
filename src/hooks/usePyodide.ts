"use client";

import { useEffect, useState } from "react";
import {
  subscribeStatus,
  load as loadRuntime,
  run as runCode,
  cancel as cancelRun,
  type PyodideStatus,
  type RunResult,
} from "@/lib/pyodide";

export type { PyodideStatus, RunResult };

/**
 * 订阅模块级 Pyodide 单例(见 src/lib/pyodide.ts)。
 * 多个 CodeRunner 共享同一个 worker,只下载一次运行时。
 */
export function usePyodide() {
  const [status, setStatus] = useState<PyodideStatus>("idle");

  useEffect(() => subscribeStatus(setStatus), []);

  return {
    status,
    load: loadRuntime,
    run: runCode,
    cancel: cancelRun,
  };
}
