export type HealthCheckResult = {
  ok: boolean;
  details?: string;
};

export type HealthCheck = {
  id: string;
  run: () => Promise<HealthCheckResult> | HealthCheckResult;
};

export type HealthCheckReport = {
  ok: boolean;
  results: Array<{ id: string; ok: boolean; details?: string }>;
};

export async function runHealthChecks(
  checks: HealthCheck[],
): Promise<HealthCheckReport> {
  const results: HealthCheckReport["results"] = [];
  for (const check of checks) {
    try {
      const res = await check.run();
      results.push({ id: check.id, ok: res.ok, details: res.details });
    } catch (err) {
      results.push({
        id: check.id,
        ok: false,
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
  return { ok: results.every((r) => r.ok), results };
}
