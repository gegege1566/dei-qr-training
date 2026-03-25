import { allVolumeKeys, VolumeKey } from "@/lib/training";

export const now = () => Date.now();

export const serializeVolumes = (volumes: VolumeKey[]) => {
  const unique = Array.from(new Set(volumes));
  return JSON.stringify(unique);
};

export const deserializeVolumes = (payload: string | null | undefined) => {
  if (!payload) {
    return allVolumeKeys;
  }

  try {
    const parsed = JSON.parse(payload) as VolumeKey[];
    const valid = parsed.filter((item): item is VolumeKey =>
      (allVolumeKeys as string[]).includes(item),
    );
    return valid.length ? valid : allVolumeKeys;
  } catch (error) {
    console.warn(`Failed to parse allowed volume payload: ${payload}`, error);
    return allVolumeKeys;
  }
};
