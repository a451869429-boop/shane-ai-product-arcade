// Colada-owned mutable runtime capsule. No other Case reads or writes these fields.
export const runtimeState = {
  generating: false,
  templateIndex: 0,
  journalStage: "canvas",
  materialIds: new Set(["photo", "sticker", "text", "date"]),
  productIndex: 0,
  generationTimer: null,
};
