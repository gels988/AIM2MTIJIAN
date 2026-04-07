"use client";

import { useEffect, useState } from "react";

import type { HealthCheck, HealthCheckReport } from "@/registry/subsystems/health-check";
import { runHealthChecks } from "@/registry/subsystems/health-check";

export function useHealthCheckOnMount(checks: HealthCheck[]) {
  const [report, setReport] = useState<HealthCheckReport | null>(null);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let isMounted = true;
    void runHealthChecks(checks).then((r) => {
      if (!isMounted) return;
      setReport(r);
      setIsRunning(false);
    });
    return () => {
      isMounted = false;
    };
  }, [checks]);

  return { report, isRunning };
}
