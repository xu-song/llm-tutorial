// 确定性伪随机数生成器(线性同余,LCG)。
// viz 组件在渲染路径上不能用 Math.random()(会导致 SSR/水合不一致),
// 用固定种子的 PRNG 重放模拟,保证服务端与客户端结果一致、可复现。
export function makeRng(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

// 从均匀 PRNG 取一个标准正态样本(Box–Muller)。
// 各 viz 此前各自实现一份;抽到这里统一复用,避免重复与实现漂移。
export function gaussian(rng: () => number): number {
  let u = rng();
  if (u < 1e-12) u = 1e-12; // 防 log(0)
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

