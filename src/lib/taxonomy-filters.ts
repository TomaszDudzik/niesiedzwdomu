export interface TaxonomyOption {
  value: string;
  label: string;
  icon: string;
  count: number;
}

export interface AgeFilterGroup {
  key: string;
  label: string;
  icon: string;
  min: number;
  max: number;
}

function normalizeTaxonomyValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getTaxonomyIcon(value: string): string {
  const normalized = normalizeTaxonomyValue(value);

  if (normalized.includes("sport") || normalized.includes("ruch") || normalized.includes("pilka") || normalized.includes("ninja")) return "⚽";
  if (normalized.includes("plyw")) return "🏊";
  if (normalized.includes("rolk")) return "🛼";
  if (normalized.includes("sztuk") || normalized.includes("tworczos") || normalized.includes("tworcz") || normalized.includes("kreat")) return "🎨";
  if (normalized.includes("muzyk") || normalized.includes("scena")) return "🎵";
  if (normalized.includes("taniec") || normalized.includes("tanec")) return "💃";
  if (normalized.includes("jezyk")) return "🗣️";
  if (normalized.includes("sensory")) return "🧩";
  if (normalized.includes("nauk") || normalized.includes("technolog") || normalized.includes("eduk") || normalized.includes("eksperyment")) return "🔬";
  if (normalized.includes("kosmos")) return "🚀";
  if (normalized.includes("przyrod") || normalized.includes("outdoor") || normalized.includes("natur") || normalized.includes("relaks")) return "🌿";
  if (normalized.includes("integr")) return "🤝";
  if (normalized.includes("przygod")) return "🏕️";
  if (normalized.includes("kulin")) return "🍳";
  if (normalized.includes("pirat")) return "🏴‍☠️";
  if (normalized.includes("superbohat")) return "🦸";
  if (normalized.includes("kolonie")) return "🏕️";
  if (normalized.includes("polkolonie")) return "☀️";
  if (normalized.includes("warsztaty_wakacyjne") || normalized.includes("warsztaty wakacyjne")) return "🖍️";
  if (normalized.includes("warsztat")) return "✂️";
  if (normalized.includes("spektakl") || normalized.includes("teatr")) return "🎭";
  if (normalized.includes("kino") || normalized.includes("film")) return "🎬";
  if (normalized.includes("festyn")) return "🎉";
  if (normalized.includes("wystaw") || normalized.includes("zwiedzani") || normalized.includes("muzeum")) return "🖼️";
  if (normalized.includes("kultura")) return "🎭";
  if (normalized.includes("zabaw") || normalized.includes("rozrywk") || normalized.includes("atrakc")) return "🎢";
  if (normalized.includes("sala zabaw")) return "🧸";
  if (normalized.includes("plac zabaw")) return "🛝";
  if (normalized.includes("art")) return "🎨";
  if (normalized.includes("ogolne") || normalized.includes("ogolny") || normalized.includes("inne")) return "✨";

  return "🏷️";
}

function defaultTaxonomyLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getTaxonomyOptions<T>(
  items: T[],
  getValue: (item: T) => string | null | undefined,
  labelMap?: Record<string, string>,
  getParentValue?: (item: T) => string | null | undefined
): TaxonomyOption[] {
  const counts = new Map<string, number>();
  const parentMap = new Map<string, string>();

  items.forEach((item) => {
    const value = getValue(item)?.trim();
    if (!value) {
      return;
    }
    counts.set(value, (counts.get(value) || 0) + 1);
    if (getParentValue && !parentMap.has(value)) {
      const parent = getParentValue(item)?.trim();
      if (parent) parentMap.set(value, parent);
    }
  });

  return Array.from(counts.entries())
    .map(([value, count]) => {
      const parent = parentMap.get(value);
      const icon = parent ? getTaxonomyIcon(parent) : getTaxonomyIcon(value);
      return {
        value,
        label: labelMap?.[value] || defaultTaxonomyLabel(value),
        icon,
        count,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "pl"));
}

export function mergeSelectedTaxonomyOptions(
  options: TaxonomyOption[],
  activeValues: string[],
  labelMap?: Record<string, string>
): TaxonomyOption[] {
  if (activeValues.length === 0) {
    return options;
  }

  const merged = new Map(options.map((option) => [option.value, option]));

  activeValues.forEach((value) => {
    if (!value || merged.has(value)) {
      return;
    }

    merged.set(value, {
      value,
      label: labelMap?.[value] || defaultTaxonomyLabel(value),
      icon: getTaxonomyIcon(value),
      count: 0,
    });
  });

  return Array.from(merged.values()).sort((left, right) => left.label.localeCompare(right.label, "pl"));
}

export function getAgeGroupOptions<T, TGroup extends AgeFilterGroup>(
  items: T[],
  getAgeMin: (item: T) => number | null,
  getAgeMax: (item: T) => number | null,
  groups: readonly TGroup[]
): Array<TGroup & { count: number }> {
  return groups.map((group) => ({
    ...group,
    count: items.reduce((count, item) => {
      const ageMin = getAgeMin(item);
      const ageMax = getAgeMax(item);
      const matches = (ageMin === null || ageMin <= group.max) && (ageMax === null || ageMax >= group.min);
      return matches ? count + 1 : count;
    }, 0),
  }));
}

export function matchesTaxonomyFilter(
  value: string | null | undefined,
  activeValues: string[]
): boolean {
  if (activeValues.length === 0) {
    return true;
  }

  return !!value && activeValues.includes(value);
}