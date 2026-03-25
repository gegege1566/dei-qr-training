export const VOLUME_PRESETS = {
  S: 3,
  M: 5,
  L: 8,
} as const;

export type VolumeKey = keyof typeof VOLUME_PRESETS;

export const allVolumeKeys = Object.keys(VOLUME_PRESETS) as VolumeKey[];

export const getQuestionCountForVolume = (volume: VolumeKey) =>
  VOLUME_PRESETS[volume];
