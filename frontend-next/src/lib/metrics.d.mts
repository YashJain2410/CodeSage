export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}
export function parseMetrics(text: string): MetricSample[];
export function sumMetric(rows: MetricSample[], name: string): number | undefined;
export function meanMetric(rows: MetricSample[], name: string): number | undefined;
export function histogramQuantile(
  rows: MetricSample[],
  name: string,
  q: number,
): number | undefined;
