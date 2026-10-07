export function parseMetrics(text) {
  return text.split('\n').flatMap((line) => {
    if (!line || line.startsWith('#')) return [];
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(.*?)\})?\s+([^\s]+)/);
    if (!m) return [];
    const value = Number(m[3]);
    if (Number.isNaN(value)) return [];
    const labels = {};
    for (const l of (m[2] || '').matchAll(/(\w+)="((?:[^"\\]|\\.)*)"/g))
      labels[l[1]] = l[2].replace(/\\"/g, '"');
    return [{ name: m[1], labels, value }];
  });
}
export function sumMetric(rows, name) {
  const values = rows.filter((r) => r.name === name);
  return values.length ? values.reduce((s, r) => s + r.value, 0) : undefined;
}
export function meanMetric(rows, name) {
  const sum = sumMetric(rows, `${name}_sum`),
    count = sumMetric(rows, `${name}_count`);
  return sum != null && count ? sum / count : undefined;
}
export function histogramQuantile(rows, name, q) {
  const buckets = new Map();
  for (const r of rows.filter((r) => r.name === `${name}_bucket`)) {
    const upper = r.labels.le === '+Inf' ? Infinity : Number(r.labels.le);
    if (!Number.isNaN(upper)) buckets.set(upper, (buckets.get(upper) || 0) + r.value);
  }
  const sorted = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  const total = sorted.at(-1)?.[1];
  if (!total) return undefined;
  const target = total * q;
  let previousUpper = 0,
    previousCount = 0;
  for (const [upper, count] of sorted) {
    if (count >= target) {
      if (!Number.isFinite(upper)) return previousUpper;
      return count === previousCount
        ? upper
        : previousUpper +
            ((upper - previousUpper) * (target - previousCount)) / (count - previousCount);
    }
    previousUpper = upper;
    previousCount = count;
  }
  return undefined;
}
