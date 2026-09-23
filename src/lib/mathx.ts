// 小型数值工具:各 viz 组件共用的纯函数,避免每个组件各写一份。
// 均为渲染安全(无随机/无时间),可在 SSR 与客户端得到一致结果。

/** 数值稳定的 softmax:先减去最大值再取指数,防溢出。返回和为 1 的概率向量。 */
export function softmax(x: number[]): number[] {
  const m = Math.max(...x);
  const e = x.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

/** 把 v 夹到 [lo, hi] 区间内。 */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
