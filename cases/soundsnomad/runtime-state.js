// SoundsNomad-owned mutable runtime capsule, including scan timer ownership.
export const runtimeState = {
  sourceId: "fog_window",
  fieldPhase: "entry",
  scanStep: 0,
  scanTimer: null,
  collectedIds: new Set(),
};
