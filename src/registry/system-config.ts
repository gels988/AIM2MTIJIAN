export type ProjectType = "LIFE" | "CRYPTO";

export type LanguageCode = "zh" | "en" | "ja" | "ko";

export type LanguageOption = {
  code: LanguageCode;
  label: string;
};

export type SubsystemFlags = {
  donation: boolean;
  healthCheck: boolean;
  registration: boolean;
};

export type DonationAddress = {
  chain: string;
  address: string;
  label?: string;
};

export type LinkMap = {
  donate?: string;
  subSystem?: string;
  deepInspect?: string;
};

export type SystemConfig = {
  projectId: string;
  projectType: ProjectType;
  brandName: string;
  languages: {
    default: LanguageCode;
    options: LanguageOption[];
  };
  subsystems: SubsystemFlags;
  donation: {
    addresses: DonationAddress[];
  };
  links: LinkMap;
};

export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: "zh", label: "中文 (ZH)" },
  { code: "en", label: "English (EN)" },
  { code: "ja", label: "日本語 (JA)" },
  { code: "ko", label: "한국어 (KO)" },
];

export function createSystemConfig(input: {
  projectId: string;
  projectType: ProjectType;
  brandName: string;
  donationAddresses?: DonationAddress[];
  links?: LinkMap;
  subsystems?: Partial<SubsystemFlags>;
  languages?: Partial<SystemConfig["languages"]>;
}): SystemConfig {
  const subsystems: SubsystemFlags = {
    donation: true,
    healthCheck: true,
    registration: true,
    ...input.subsystems,
  };

  const languages: SystemConfig["languages"] = {
    default: input.languages?.default ?? "zh",
    options: input.languages?.options ?? DEFAULT_LANGUAGES,
  };

  return {
    projectId: input.projectId,
    projectType: input.projectType,
    brandName: input.brandName,
    languages,
    subsystems,
    donation: {
      addresses: input.donationAddresses ?? [],
    },
    links: input.links ?? {},
  };
}
