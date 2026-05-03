export function clampNonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

export function subtractFloor(current: number, delta: number): number {
  return clampNonNegative(current - delta);
}
