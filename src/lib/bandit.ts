// 多臂老虎机的共享设定 —— BanditExplorer 与 PolicyGradientViz 共用同一个 4 臂问题,
// 抽出来保证两个 viz 的臂数、真实中奖率、配色、最优臂完全一致(否则并排看会对不上)。
export const BANDIT_TRUE = [0.2, 0.5, 0.75, 0.4]; // 各臂真实中奖率
export const BANDIT_BEST = 2; // 真实最优臂下标(BANDIT_TRUE.argmax())
export const BANDIT_COLORS = ["#0ea5e9", "#8b5cf6", "#059669", "#f59e0b"];
export const BANDIT_K = BANDIT_TRUE.length;

// Marsaglia-Tsang Gamma 采样 → Beta 采样(Thompson sampling 用)。
// BanditStrategyCompare 与 BanditRegretViz 共用,避免两份重复实现漂移。
// rng 为 () => number 的均匀 [0,1) 生成器(通常为 makeRng 的产物,SSR 安全)。
export function gammaSample(shape: number, rng: () => number): number {
  if (shape < 1) return gammaSample(shape + 1, rng) * Math.pow(rng() || 1e-10, 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do {
      const u1 = rng() || 1e-10, u2 = rng();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function betaSample(a: number, b: number, rng: () => number): number {
  const x = gammaSample(a, rng);
  const y = gammaSample(b, rng);
  return x / (x + y);
}

