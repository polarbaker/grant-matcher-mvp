/**
 * Calculate Jaccard similarity between two arrays of strings
 * @param a First array of strings
 * @param b Second array of strings
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(a: string[], b: string[]): number {
  // Convert arrays to sets for easier intersection/union calculation
  const setA = new Set(a.map(s => s.toLowerCase()));
  const setB = new Set(b.map(s => s.toLowerCase()));

  // Calculate intersection
  const intersection = new Set([...setA].filter(x => setB.has(x)));

  // Calculate union
  const union = new Set([...setA, ...setB]);

  // Return Jaccard similarity coefficient
  return intersection.size / union.size;
}

/**
 * Calculate weighted similarity between two objects
 */
export function calculateWeightedSimilarity(
  obj1: Record<string, any>,
  obj2: Record<string, any>,
  weights: Record<string, number>
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (obj1[key] === undefined || obj2[key] === undefined) continue;

    let score: number;
    if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
      score = calculateSimilarity(obj1[key], obj2[key]);
    } else if (typeof obj1[key] === 'string' && typeof obj2[key] === 'string') {
      score = calculateSimilarity([obj1[key]], [obj2[key]]);
    } else {
      score = obj1[key] === obj2[key] ? 1 : 0;
    }

    totalScore += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}
