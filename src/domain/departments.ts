import type { IssueCategory, MunicipalDepartment } from './types.js';

export const CATEGORY_LABELS: Readonly<Record<IssueCategory, string>> = {
  roads_potholes: 'Roads & Potholes',
  waste_management: 'Waste & Garbage',
  street_lighting: 'Street Lighting',
  water_drainage: 'Water & Drainage',
  public_health: 'Public Health & Sanitation',
  traffic_safety: 'Traffic & Public Safety',
};

export const CATEGORY_TO_DEPARTMENT: Readonly<Record<IssueCategory, MunicipalDepartment>> = {
  roads_potholes: 'Roads & Infrastructure Division',
  waste_management: 'Solid Waste Management Department',
  street_lighting: 'Street Lighting & Electrical Wing',
  water_drainage: 'Water Supply & Drainage Board',
  public_health: 'Public Health & Sanitation Cell',
  traffic_safety: 'Traffic & Public Safety Authority',
};

const CATEGORY_KEYWORDS: Readonly<Record<IssueCategory, readonly string[]>> = {
  roads_potholes: ['pothole', 'road', 'asphalt', 'pavement', 'bridge', 'sinkhole', 'crater'],
  waste_management: ['garbage', 'trash', 'waste', 'bin', 'dump', 'litter', 'overflowing'],
  street_lighting: ['streetlight', 'lamp', 'light', 'dark', 'pole', 'electrical', 'wire'],
  water_drainage: ['water', 'leak', 'pipe', 'drain', 'sewage', 'flood', 'waterlogging'],
  public_health: ['mosquito', 'stagnant', 'odor', 'sanitation', 'pest', 'hygiene', 'biohazard'],
  traffic_safety: ['signal', 'traffic', 'crosswalk', 'sign', 'barrier', 'accident', 'junction'],
};

/**
 * Returns the primary municipal department responsible for a civic issue category.
 *
 * @param category - Classified civic issue category.
 * @returns The recommended municipal department name.
 */
export function recommendDepartment(category: IssueCategory): MunicipalDepartment {
  return CATEGORY_TO_DEPARTMENT[category];
}

/**
 * Counts keyword matches for a candidate category against normalized complaint text.
 *
 * @param text - Lowercased combined title and description.
 * @param keywords - Domain keywords for the category.
 * @returns Number of matching keywords.
 */
function countKeywordMatches(text: string, keywords: readonly string[]): number {
  return keywords.reduce((total, word) => (text.includes(word) ? total + 1 : total), 0);
}

/**
 * Deterministically classifies a civic complaint into one of the six canonical categories.
 *
 * @param title - Short complaint title.
 * @param description - Detailed citizen report.
 * @param hint - Optional user-selected category used as tie-breaker.
 * @returns The best matching canonical IssueCategory.
 */
export function classifyCategoryDeterministic(
  title: string,
  description: string,
  hint?: IssueCategory,
): IssueCategory {
  const combined = `${title} ${description}`.toLowerCase();
  let bestCategory: IssueCategory = hint ?? 'roads_potholes';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    IssueCategory,
    readonly string[],
  ][]) {
    const score = countKeywordMatches(combined, keywords);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}
