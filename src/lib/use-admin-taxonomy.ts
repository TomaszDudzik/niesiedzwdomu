"use client";

import { useEffect, useState } from "react";
import type {
  AdminCategoryLevel1,
  AdminCategoryLevel2,
  AdminCategoryLevel3,
  AdminTaxonomyResponse,
  AdminTypeLevel1,
  AdminTypeLevel2,
} from "@/lib/admin-taxonomy";

const EMPTY_TAXONOMY: AdminTaxonomyResponse = {
  type_lvl_1: [],
  type_lvl_2: [],
  category_lvl_1: [],
  category_lvl_2: [],
  category_lvl_3: [],
};

function hasTaxonomyData(taxonomy: AdminTaxonomyResponse) {
  return taxonomy.type_lvl_1.length > 0
    || taxonomy.type_lvl_2.length > 0
    || taxonomy.category_lvl_1.length > 0
    || taxonomy.category_lvl_2.length > 0
    || taxonomy.category_lvl_3.length > 0;
}

export function useAdminTaxonomy(initialTaxonomy: AdminTaxonomyResponse = EMPTY_TAXONOMY) {
  const hasInitialTaxonomy = hasTaxonomyData(initialTaxonomy);
  const [typeLevel1Options, setTypeLevel1Options] = useState<AdminTypeLevel1[]>(initialTaxonomy.type_lvl_1);
  const [typeLevel2Options, setTypeLevel2Options] = useState<AdminTypeLevel2[]>(initialTaxonomy.type_lvl_2);
  const [categoryLevel1Options, setCategoryLevel1Options] = useState<AdminCategoryLevel1[]>(initialTaxonomy.category_lvl_1);
  const [categoryLevel2Options, setCategoryLevel2Options] = useState<AdminCategoryLevel2[]>(initialTaxonomy.category_lvl_2);
  const [categoryLevel3Options, setCategoryLevel3Options] = useState<AdminCategoryLevel3[]>(initialTaxonomy.category_lvl_3);
  const [loading, setLoading] = useState(!hasInitialTaxonomy);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/taxonomy")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Taxonomy request failed with ${response.status}`);
        }
        return response.json() as Promise<AdminTaxonomyResponse>;
      })
      .then((data) => {
        if (!active) return;
        setTypeLevel1Options(Array.isArray(data.type_lvl_1) ? data.type_lvl_1 : EMPTY_TAXONOMY.type_lvl_1);
        setTypeLevel2Options(Array.isArray(data.type_lvl_2) ? data.type_lvl_2 : EMPTY_TAXONOMY.type_lvl_2);
        setCategoryLevel1Options(Array.isArray(data.category_lvl_1) ? data.category_lvl_1 : EMPTY_TAXONOMY.category_lvl_1);
        setCategoryLevel2Options(Array.isArray(data.category_lvl_2) ? data.category_lvl_2 : EMPTY_TAXONOMY.category_lvl_2);
        setCategoryLevel3Options(Array.isArray(data.category_lvl_3) ? data.category_lvl_3 : EMPTY_TAXONOMY.category_lvl_3);
      })
      .catch(() => {
        if (!active) return;
        if (!hasInitialTaxonomy) {
          setTypeLevel1Options(EMPTY_TAXONOMY.type_lvl_1);
          setTypeLevel2Options(EMPTY_TAXONOMY.type_lvl_2);
          setCategoryLevel1Options(EMPTY_TAXONOMY.category_lvl_1);
          setCategoryLevel2Options(EMPTY_TAXONOMY.category_lvl_2);
          setCategoryLevel3Options(EMPTY_TAXONOMY.category_lvl_3);
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    typeLevel1Options,
    typeLevel2Options,
    categoryLevel1Options,
    categoryLevel2Options,
    categoryLevel3Options,
    loading,
  };
}