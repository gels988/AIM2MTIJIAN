import type { StandardDictionary } from "@/registry/i18n/dictionaries";
import { STANDARD_I18N } from "@/registry/i18n/dictionaries";
import type { ProjectType, SystemConfig } from "@/registry/system-config";
import { createSystemConfig } from "@/registry/system-config";
import { DonationModule } from "@/registry/subsystems/donation";
import type { HealthCheck } from "@/registry/subsystems/health-check";

export type ProjectModules = {
  donation?: {
    Component: typeof DonationModule;
    props: {
      title: string;
      addresses: SystemConfig["donation"]["addresses"];
    };
  };
  healthCheck?: {
    checks: HealthCheck[];
  };
};

export type ProjectRuntime = {
  config: SystemConfig;
  i18n: Record<SystemConfig["languages"]["default"] | string, StandardDictionary>;
  modules: ProjectModules;
};

export function createProject(params: {
  projectType: ProjectType;
  projectId: string;
  brandName: string;
  donationAddresses?: SystemConfig["donation"]["addresses"];
  links?: SystemConfig["links"];
  subsystems?: Partial<SystemConfig["subsystems"]>;
}): ProjectRuntime {
  const config = createSystemConfig({
    projectId: params.projectId,
    projectType: params.projectType,
    brandName: params.brandName,
    donationAddresses: params.donationAddresses,
    links: params.links,
    subsystems: params.subsystems,
  });

  const modules: ProjectModules = {};

  if (config.subsystems.donation) {
    modules.donation = {
      Component: DonationModule,
      props: {
        title: `${config.brandName} · Donation`,
        addresses: config.donation.addresses,
      },
    };
  }

  if (config.subsystems.healthCheck) {
    const checks: HealthCheck[] = [
      {
        id: "config",
        run: () => ({ ok: Boolean(config.projectId) }),
      },
    ];

    modules.healthCheck = { checks };
  }

  return {
    config,
    i18n: STANDARD_I18N,
    modules,
  };
}
