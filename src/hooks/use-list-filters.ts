"use client";

import { useMemo, useState } from "react";
import { DISTRICT_LIST } from "@/lib/mock-data";
import {
  getAgeGroupOptions,
  getTaxonomyOptions,
  matchesTaxonomyFilter,
  mergeSelectedTaxonomyOptions,
} from "@/lib/taxonomy-filters";
import type { AgeFilterGroup, TaxonomyOption } from "@/lib/taxonomy-filters";
import type { FilterBadge } from "@/components/ui/filter-badge-bar";
import type { District } from "@/types/database";

export type { FilterBadge };

export interface ListFiltersConfig<T> {
  items: T[];
  ageGroups: readonly AgeFilterGroup[];
  getType: (item: T) => string | null | undefined;
  getCategory: (item: T) => string | null | undefined;
  getSubcategory?: (item: T) => string | null | undefined;
  getDistrict: (item: T) => District;
  getAgeMin: (item: T) => number | null;
  getAgeMax: (item: T) => number | null;
  getSearchText: (item: T) => string;
}

type ExcludedDimension = "type" | "category" | "subcategory" | "district" | "age";

export function useListFilters<T>({
  items,
  ageGroups,
  getType,
  getCategory,
  getSubcategory,
  getDistrict,
  getAgeMin,
  getAgeMax,
  getSearchText,
}: ListFiltersConfig<T>) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeSubcategories, setActiveSubcategories] = useState<string[]>([]);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [activeAgeGroups, setActiveAgeGroups] = useState<string[]>([]);

  const selectedAgeGroups = useMemo(
    () => ageGroups.filter((g) => activeAgeGroups.includes(g.key)),
    [ageGroups, activeAgeGroups]
  );

  function matchesItem(item: T, excluded: ExcludedDimension[] = []): boolean {
    if (search && !getSearchText(item).toLowerCase().includes(search.toLowerCase())) return false;
    if (!excluded.includes("type") && !matchesTaxonomyFilter(getType(item), activeTypes)) return false;
    if (!excluded.includes("category") && !matchesTaxonomyFilter(getCategory(item), activeCategories)) return false;
    if (getSubcategory && !excluded.includes("subcategory") && !matchesTaxonomyFilter(getSubcategory(item), activeSubcategories)) return false;
    if (!excluded.includes("district") && activeDistricts.length > 0 && !activeDistricts.includes(getDistrict(item))) return false;
    if (!excluded.includes("age") && selectedAgeGroups.length > 0) {
      const ageMin = getAgeMin(item);
      const ageMax = getAgeMax(item);
      if (!selectedAgeGroups.some((g) => (ageMin === null || ageMin <= g.max) && (ageMax === null || ageMax >= g.min))) return false;
    }
    return true;
  }

  const filteredItems = useMemo(
    () => items.filter((item) => matchesItem(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, search, activeTypes, activeCategories, activeSubcategories, activeDistricts, selectedAgeGroups]
  );

  const typeOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(items.filter((i) => matchesItem(i, ["type"])), getType),
      activeTypes
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, search, activeCategories, activeSubcategories, activeDistricts, selectedAgeGroups, activeTypes]
  );

  const typeOptionsByValue = useMemo(
    () => new Map(typeOptions.map((o) => [o.value, o])),
    [typeOptions]
  );

  const categoryOptions = useMemo(
    () => mergeSelectedTaxonomyOptions(
      getTaxonomyOptions(items.filter((i) => matchesItem(i, ["category"])), getCategory, undefined, getType),
      activeCategories
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, search, activeTypes, activeSubcategories, activeDistricts, selectedAgeGroups, activeCategories]
  );

  const categoryOptionsByValue = useMemo(
    () => new Map(categoryOptions.map((o) => [o.value, o])),
    [categoryOptions]
  );

  const subcategoryOptions = useMemo(
    () => getSubcategory
      ? mergeSelectedTaxonomyOptions(
          getTaxonomyOptions(items.filter((i) => matchesItem(i, ["subcategory"])), getSubcategory, undefined, getCategory),
          activeSubcategories
        )
      : [] as TaxonomyOption[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, search, activeTypes, activeCategories, activeDistricts, selectedAgeGroups, activeSubcategories]
  );

  const subcategoryOptionsByValue = useMemo(
    () => new Map(subcategoryOptions.map((o) => [o.value, o])),
    [subcategoryOptions]
  );

  const districtSource = useMemo(
    () => items.filter((i) => matchesItem(i, ["district"])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, search, activeTypes, activeCategories, activeSubcategories, selectedAgeGroups]
  );

  const districtCounts = useMemo(() => {
    const counts = new Map<District, number>();
    districtSource.forEach((item) => {
      const d = getDistrict(item);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    });
    return counts;
  }, [districtSource]);

  const availableDistricts = useMemo(() => {
    const set = new Set(districtSource.map(getDistrict));
    return DISTRICT_LIST.filter((d) => set.has(d) || activeDistricts.includes(d));
  }, [districtSource, activeDistricts]);

  const ageOptions = useMemo(
    () => getAgeGroupOptions(
      items.filter((i) => matchesItem(i, ["age"])),
      getAgeMin,
      getAgeMax,
      ageGroups
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, search, activeTypes, activeCategories, activeSubcategories, activeDistricts, ageGroups]
  );

  const hasActiveFilters =
    !!search ||
    activeTypes.length > 0 ||
    activeCategories.length > 0 ||
    activeSubcategories.length > 0 ||
    activeDistricts.length > 0 ||
    activeAgeGroups.length > 0;

  const filterBadges = useMemo((): FilterBadge[] => {
    const badges: FilterBadge[] = [];
    if (search.trim()) {
      badges.push({ id: "search", label: `Szukaj: ${search.trim()}`, onRemove: () => setSearch("") });
    }
    activeTypes.forEach((v) => badges.push({
      id: `type-${v}`,
      label: `Typ: ${typeOptionsByValue.get(v)?.label ?? v}`,
      onRemove: () => setActiveTypes((p) => p.filter((x) => x !== v)),
    }));
    activeCategories.forEach((v) => badges.push({
      id: `cat-${v}`,
      label: `Kategoria: ${categoryOptionsByValue.get(v)?.label ?? v}`,
      onRemove: () => setActiveCategories((p) => p.filter((x) => x !== v)),
    }));
    activeSubcategories.forEach((v) => badges.push({
      id: `sub-${v}`,
      label: `Tematyka: ${subcategoryOptionsByValue.get(v)?.label ?? v}`,
      onRemove: () => setActiveSubcategories((p) => p.filter((x) => x !== v)),
    }));
    activeAgeGroups.forEach((k) => {
      const g = ageGroups.find((a) => a.key === k);
      if (g) badges.push({ id: `age-${k}`, label: `Wiek: ${g.label}`, onRemove: () => setActiveAgeGroups((p) => p.filter((x) => x !== k)) });
    });
    activeDistricts.forEach((d) => badges.push({
      id: `district-${d}`,
      label: `Dzielnica: ${d}`,
      onRemove: () => setActiveDistricts((p) => p.filter((x) => x !== d)),
    }));
    return badges;
  }, [search, activeTypes, activeCategories, activeSubcategories, activeAgeGroups, activeDistricts, typeOptionsByValue, categoryOptionsByValue, subcategoryOptionsByValue, ageGroups]);

  function clearFilters() {
    setSearch("");
    setActiveTypes([]);
    setActiveCategories([]);
    setActiveSubcategories([]);
    setActiveDistricts([]);
    setActiveAgeGroups([]);
  }

  function toggleType(v: string) {
    setActiveTypes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
    setActiveCategories([]);
    setActiveSubcategories([]);
  }

  function toggleCategory(v: string) {
    setActiveCategories((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
    setActiveSubcategories([]);
  }

  function toggleSubcategory(v: string) {
    setActiveSubcategories((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  }

  function toggleDistrict(d: District) {
    setActiveDistricts((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);
  }

  function toggleAgeGroup(k: string) {
    setActiveAgeGroups((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]);
  }

  return {
    search,
    setSearch,
    activeTypes,
    activeCategories,
    activeSubcategories,
    activeDistricts,
    activeAgeGroups,
    filteredItems,
    hasActiveFilters,
    filterBadges,
    typeOptions,
    typeOptionsByValue,
    categoryOptions,
    categoryOptionsByValue,
    subcategoryOptions,
    subcategoryOptionsByValue,
    districtCounts,
    availableDistricts,
    ageOptions,
    toggleType,
    toggleCategory,
    toggleSubcategory,
    toggleDistrict,
    toggleAgeGroup,
    clearFilters,
  };
}
