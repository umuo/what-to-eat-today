export function pickWeightedItem(items, excludedIds = new Set()) {
  const activeItems = items.filter((item) => !excludedIds.has(item.id));
  if (activeItems.length === 0) {
    return { winner: null, winnerIndex: -1, activeItems: [] };
  }
  const weights = activeItems.map((item) => Math.max(1, Number(item.weight) || 1));
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < activeItems.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      return { winner: activeItems[i], winnerIndex: i, activeItems };
    }
  }
  const lastIdx = activeItems.length - 1;
  return { winner: activeItems[lastIdx], winnerIndex: lastIdx, activeItems };
}
