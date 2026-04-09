const defaultSite = process.env.SITE_URL || process.env.SURVIVAL_SITE_URL || "";
const siteUrl = defaultSite || "http://127.0.0.1:3000";
const healthUrl = `${siteUrl.replace(/\/+$/, "")}/api/health`;

async function run() {
  const startedAt = new Date().toISOString();
  let ok = false;
  let status = 0;
  let details = "";

  try {
    const res = await fetch(healthUrl, { cache: "no-store" });
    status = res.status;
    details = await res.text();
    ok = res.ok;
  } catch (e) {
    details = e instanceof Error ? e.message : "fetch_failed";
  }

  if (ok) {
    process.stdout.write(
      JSON.stringify({ status: "ok", startedAt, url: healthUrl, http: status }) + "\n",
    );
    return;
  }

  process.stderr.write(
    JSON.stringify({
      status: "error",
      startedAt,
      url: healthUrl,
      http: status || null,
      details: String(details).slice(0, 500),
    }) + "\n",
  );

  const hook = process.env.DEPLOY_HOOK_URL || "";
  if (hook) {
    try {
      const res = await fetch(hook, { method: "POST" });
      process.stderr.write(
        JSON.stringify({
          action: "deploy_hook",
          ok: res.ok,
          http: res.status,
          url: hook,
        }) + "\n",
      );
    } catch (e) {
      process.stderr.write(
        JSON.stringify({
          action: "deploy_hook",
          ok: false,
          http: null,
          url: hook,
          error: e instanceof Error ? e.message : "fetch_failed",
        }) + "\n",
      );
    }
  }

  process.exitCode = 1;
}

run();

