import {
  getCategoryLevel2ForCategoryLevel1,
  getCategoryLevel3ForCategoryLevel2,
  getTypeLevel2ForTypeLevel1,
} from "@/lib/admin-taxonomy";
import type {
  AdminCategoryLevel1,
  AdminCategoryLevel2,
  AdminCategoryLevel3,
  AdminTypeLevel1,
  AdminTypeLevel2,
} from "@/lib/admin-taxonomy";

interface TaxonomyFieldsProps {
  typeLevel1Options: AdminTypeLevel1[];
  typeLevel2Options: AdminTypeLevel2[];
  categoryLevel1Options: AdminCategoryLevel1[];
  categoryLevel2Options: AdminCategoryLevel2[];
  categoryLevel3Options: AdminCategoryLevel3[];
  showTypeFields?: boolean;
  typeLevel1Label?: string;
  typeLevel2Label?: string;
  categoryLevel1Label?: string;
  categoryLevel2Label?: string;
  categoryLevel3Label?: string;
  selectedTypeLevel1Id: string | null;
  selectedTypeLevel2Id: string | null;
  selectedCategoryLevel1: string | null;
  selectedCategoryLevel2: string | null;
  selectedCategoryLevel3: string | null;
  loading?: boolean;
  inputClass: string;
  labelClass: string;
  onTypeLevel1Change: (value: string | null) => void;
  onTypeLevel2Change: (value: string | null) => void;
  onCategoryLevel1Change: (value: string | null) => void;
  onCategoryLevel2Change: (value: string | null) => void;
  onCategoryLevel3Change: (value: string | null) => void;
}

export function TaxonomyFields({
  typeLevel1Options,
  typeLevel2Options,
  categoryLevel1Options,
  categoryLevel2Options,
  categoryLevel3Options,
  showTypeFields = true,
  typeLevel1Label = "Type lvl 1",
  typeLevel2Label = "Type lvl 2",
  categoryLevel1Label = "Category lvl 1",
  categoryLevel2Label = "Category lvl 2",
  categoryLevel3Label = "Category lvl 3",
  selectedTypeLevel1Id,
  selectedTypeLevel2Id,
  selectedCategoryLevel1,
  selectedCategoryLevel2,
  selectedCategoryLevel3,
  loading = false,
  inputClass,
  labelClass,
  onTypeLevel1Change,
  onTypeLevel2Change,
  onCategoryLevel1Change,
  onCategoryLevel2Change,
  onCategoryLevel3Change,
}: TaxonomyFieldsProps) {
  const typeLevel2ForTypeLevel1 = getTypeLevel2ForTypeLevel1(typeLevel2Options, selectedTypeLevel1Id);
  const selectedCategoryLevel1Entry = categoryLevel1Options.find(
    (entry) => entry.name === selectedCategoryLevel1 || entry.id === selectedCategoryLevel1,
  ) ?? null;
  const categoryLevel2ForCategoryLevel1 = getCategoryLevel2ForCategoryLevel1(categoryLevel2Options, selectedCategoryLevel1Entry?.id);
  const selectedCategoryLevel2Entry = categoryLevel2ForCategoryLevel1.find(
    (entry) => entry.name === selectedCategoryLevel2 || entry.id === selectedCategoryLevel2,
  ) ?? null;
  const categoryLevel3ForCategoryLevel2 = getCategoryLevel3ForCategoryLevel2(categoryLevel3Options, selectedCategoryLevel2Entry?.id);
  const selectedCategoryLevel3Entry = categoryLevel3ForCategoryLevel2.find(
    (entry) => entry.name === selectedCategoryLevel3 || entry.id === selectedCategoryLevel3,
  ) ?? null;
  const selectClass = `${inputClass} w-full min-w-0`;

  return (
    <>
      {showTypeFields && (
        <div className="md:col-span-4 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className={labelClass}>{typeLevel1Label}</label>
            <select
              className={selectClass}
              value={selectedTypeLevel1Id ?? ""}
              onChange={(event) => {
                const nextTypeLevel1Id = event.target.value || null;
                onTypeLevel1Change(nextTypeLevel1Id);
                onTypeLevel2Change(null);
              }}
              disabled={loading}
            >
              <option value="">{loading ? "Ładowanie..." : "— brak —"}</option>
              {typeLevel1Options.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-6">
            <label className={labelClass}>{typeLevel2Label}</label>
            <select
              className={selectClass}
              value={selectedTypeLevel2Id ?? ""}
              onChange={(event) => onTypeLevel2Change(event.target.value || null)}
              disabled={loading || !selectedTypeLevel1Id}
            >
              <option value="">{selectedTypeLevel1Id ? "— brak —" : "Najpierw wybierz type lvl 1"}</option>
              {typeLevel2ForTypeLevel1.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="md:col-span-4 grid gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <label className={labelClass}>{categoryLevel1Label}</label>
          <select
            className={selectClass}
            value={selectedCategoryLevel1Entry?.name ?? ""}
            onChange={(event) => {
              const nextCategoryLevel1 = event.target.value || null;
              onCategoryLevel1Change(nextCategoryLevel1);
              onCategoryLevel2Change(null);
              onCategoryLevel3Change(null);
            }}
            disabled={loading}
          >
            <option value="">{loading ? "Ładowanie..." : "— brak —"}</option>
            {categoryLevel1Options.map((entry) => (
              <option key={entry.id} value={entry.name}>{entry.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4">
          <label className={labelClass}>{categoryLevel2Label}</label>
          <select
            className={selectClass}
            value={selectedCategoryLevel2Entry?.name ?? ""}
            onChange={(event) => {
              const nextCategoryLevel2 = event.target.value || null;
              onCategoryLevel2Change(nextCategoryLevel2);
              onCategoryLevel3Change(null);
            }}
            disabled={loading || !selectedCategoryLevel1}
          >
            <option value="">{selectedCategoryLevel1 ? "— brak —" : "Najpierw wybierz category lvl 1"}</option>
            {categoryLevel2ForCategoryLevel1.map((entry) => (
              <option key={entry.id} value={entry.name}>{entry.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4">
          <label className={labelClass}>{categoryLevel3Label}</label>
          <select
            className={selectClass}
            value={selectedCategoryLevel3Entry?.name ?? ""}
            onChange={(event) => onCategoryLevel3Change(event.target.value || null)}
            disabled={loading || !selectedCategoryLevel2}
          >
            <option value="">{selectedCategoryLevel2 ? "— brak —" : "Najpierw wybierz category lvl 2"}</option>
            {categoryLevel3ForCategoryLevel2.map((entry) => (
              <option key={entry.id} value={entry.name}>{entry.name}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}