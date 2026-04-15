interface TaxonomyOption {
  value: string;
  label: string;
  count: number;
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
  labelMap?: Record<string, string>
): TaxonomyOption[] {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const value = getValue(item)?.trim();
    if (!value) {
      return;
    }

    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      label: labelMap?.[value] || defaultTaxonomyLabel(value),
      count,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "pl"));
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