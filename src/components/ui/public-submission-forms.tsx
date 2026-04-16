"use client";

import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Tent, Music4, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISTRICT_LIST } from "@/lib/mock-data";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";
import {
  type AdminCategoryLevel1,
  type AdminCategoryLevel2,
  type AdminCategoryLevel3,
  type AdminTypeLevel1,
  type AdminTypeLevel2,
  getCategoryLevel2ForCategoryLevel1,
  getCategoryLevel3ForCategoryLevel2,
  getTypeLevel2ForTypeLevel1,
} from "@/lib/admin-taxonomy";

type SubmissionKind = "event" | "place" | "camp" | "activity";

type ContactState = {
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string;
  organization_name: string;
  notes: string;
};

type EventFormState = {
  title: string;
  organizer: string;
  description_short: string;
  description_long: string;
  type_lvl_1_id: string;
  type_lvl_2_id: string;
  category_lvl_1: string;
  category_lvl_2: string;
  category_lvl_3: string;
  category: string;
  date_start: string;
  date_end: string;
  time_start: string;
  time_end: string;
  age_min: string;
  age_max: string;
  price: string;
  is_free: boolean;
  district: string;
  venue_name: string;
  venue_address: string;
  source_url: string;
  facebook_url: string;
  image_url: string;
};

type PlaceFormState = {
  title: string;
  description_short: string;
  description_long: string;
  type_lvl_1_id: string;
  type_lvl_2_id: string;
  category_lvl_1: string;
  category_lvl_2: string;
  category_lvl_3: string;
  place_type: string;
  is_indoor: boolean;
  street: string;
  city: string;
  district: string;
  age_min: string;
  age_max: string;
  price: string;
  is_free: boolean;
  amenities: string;
  opening_hours: string;
  source_url: string;
  facebook_url: string;
  image_url: string;
};

type CampFormState = {
  title: string;
  organizer: string;
  description_short: string;
  description_long: string;
  type_lvl_1_id: string;
  type_lvl_2_id: string;
  category_lvl_1: string;
  category_lvl_2: string;
  category_lvl_3: string;
  season: string;
  date_start: string;
  date_end: string;
  duration_days: string;
  meals_included: boolean;
  transport_included: boolean;
  age_min: string;
  age_max: string;
  price_from: string;
  price_to: string;
  is_free: boolean;
  district: string;
  venue_name: string;
  venue_address: string;
  source_url: string;
  facebook_url: string;
  image_url: string;
};

type ActivityFormState = {
  title: string;
  organizer: string;
  description_short: string;
  description_long: string;
  type_lvl_1_id: string;
  type_lvl_2_id: string;
  category_lvl_1: string;
  category_lvl_2: string;
  category_lvl_3: string;
  activity_type: string;
  schedule_summary: string;
  days_of_week: string[];
  date_start: string;
  date_end: string;
  time_start: string;
  time_end: string;
  age_min: string;
  age_max: string;
  price_from: string;
  price_to: string;
  is_free: boolean;
  district: string;
  venue_name: string;
  venue_address: string;
  source_url: string;
  facebook_url: string;
  image_url: string;
};

const TODAY = new Date().toISOString().split("T")[0];

const EVENT_CATEGORY_OPTIONS = [
  ["warsztaty", "Warsztaty"],
  ["spektakl", "Spektakl"],
  ["muzyka", "Muzyka"],
  ["sport", "Sport"],
  ["natura", "Natura"],
  ["edukacja", "Edukacja"],
  ["festyn", "Festyn"],
  ["kino", "Kino"],
  ["wystawa", "Wystawa"],
  ["inne", "Inne"],
] as const;

const PLACE_TYPE_OPTIONS = [
  "Relaks i natura",
  "Nauka przez zabawę",
  "Szybka rozrywka / atrakcje",
  "Ruch i aktywność fizyczna",
  "Oglądanie / kultura",
  "Kreatywność i warsztaty",
  "Sala zabaw",
  "Plac zabaw",
  "inne",
];

const CAMP_SEASON_OPTIONS = [
  ["lato", "Lato"],
  ["zima", "Zima"],
  ["ferie_zimowe", "Ferie zimowe"],
  ["ferie_wiosenne", "Ferie wiosenne"],
  ["caly_rok", "Cały rok"],
] as const;

const ACTIVITY_TYPE_OPTIONS = [
  ["sportowe", "Sportowe"],
  ["artystyczne", "Artystyczne"],
  ["edukacyjne", "Edukacyjne"],
  ["muzyczne", "Muzyczne"],
  ["taneczne", "Taneczne"],
  ["jezykowe", "Językowe"],
  ["sensoryczne", "Sensoryczne"],
  ["inne", "Inne"],
] as const;

const DAYS_OF_WEEK = [
  ["pon", "Poniedziałek"],
  ["wt", "Wtorek"],
  ["sr", "Środa"],
  ["czw", "Czwartek"],
  ["pt", "Piątek"],
  ["sob", "Sobota"],
  ["ndz", "Niedziela"],
] as const;

const TAB_CONFIG = {
  event: {
    title: "Wydarzenie",
    description: "Jednorazowe lub cykliczne wydarzenia dla dzieci i rodzin.",
    icon: CalendarDays,
  },
  place: {
    title: "Miejsce",
    description: "Adres przyjazny rodzinom, do którego warto odesłać innych.",
    icon: MapPin,
  },
  camp: {
    title: "Kolonie i półkolonie",
    description: "Turnusy, wyjazdy i półkolonie z ofertą dla dzieci.",
    icon: Tent,
  },
  activity: {
    title: "Zajęcia",
    description: "Regularne aktywności, kursy i zajęcia dodatkowe.",
    icon: Music4,
  },
} as const;

const EMPTY_CONTACT: ContactState = {
  submitter_name: "",
  submitter_email: "",
  submitter_phone: "",
  organization_name: "",
  notes: "",
};

const EMPTY_EVENT_FORM: EventFormState = {
  title: "",
  organizer: "",
  description_short: "",
  description_long: "",
  type_lvl_1_id: "",
  type_lvl_2_id: "",
  category_lvl_1: "",
  category_lvl_2: "",
  category_lvl_3: "",
  category: "inne",
  date_start: TODAY,
  date_end: "",
  time_start: "",
  time_end: "",
  age_min: "",
  age_max: "",
  price: "",
  is_free: false,
  district: DISTRICT_LIST[0],
  venue_name: "",
  venue_address: "",
  source_url: "",
  facebook_url: "",
  image_url: "",
};

const EMPTY_PLACE_FORM: PlaceFormState = {
  title: "",
  description_short: "",
  description_long: "",
  type_lvl_1_id: "",
  type_lvl_2_id: "",
  category_lvl_1: "",
  category_lvl_2: "",
  category_lvl_3: "",
  place_type: "inne",
  is_indoor: false,
  street: "",
  city: "Kraków",
  district: DISTRICT_LIST[0],
  age_min: "",
  age_max: "",
  price: "",
  is_free: false,
  amenities: "",
  opening_hours: "",
  source_url: "",
  facebook_url: "",
  image_url: "",
};

const EMPTY_CAMP_FORM: CampFormState = {
  title: "",
  organizer: "",
  description_short: "",
  description_long: "",
  type_lvl_1_id: "",
  type_lvl_2_id: "",
  category_lvl_1: "",
  category_lvl_2: "",
  category_lvl_3: "",
  season: "lato",
  date_start: TODAY,
  date_end: TODAY,
  duration_days: "",
  meals_included: false,
  transport_included: false,
  age_min: "",
  age_max: "",
  price_from: "",
  price_to: "",
  is_free: false,
  district: DISTRICT_LIST[0],
  venue_name: "",
  venue_address: "",
  source_url: "",
  facebook_url: "",
  image_url: "",
};

const EMPTY_ACTIVITY_FORM: ActivityFormState = {
  title: "",
  organizer: "",
  description_short: "",
  description_long: "",
  type_lvl_1_id: "",
  type_lvl_2_id: "",
  category_lvl_1: "",
  category_lvl_2: "",
  category_lvl_3: "",
  activity_type: "inne",
  schedule_summary: "",
  days_of_week: [],
  date_start: TODAY,
  date_end: "",
  time_start: "",
  time_end: "",
  age_min: "",
  age_max: "",
  price_from: "",
  price_to: "",
  is_free: false,
  district: DISTRICT_LIST[0],
  venue_name: "",
  venue_address: "",
  source_url: "",
  facebook_url: "",
  image_url: "",
};

const panelClass = "rounded-3xl border border-border bg-card p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.45)] md:p-6";
const labelClass = "mb-1.5 block text-[12px] font-medium text-foreground";
const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100";
const textareaClass = `${inputClass} min-h-[112px] resize-y`;

type TaxonomyState = {
  type_lvl_1_id: string;
  type_lvl_2_id: string;
  category_lvl_1: string;
  category_lvl_2: string;
  category_lvl_3: string;
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-[17px] font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-[13px] leading-6 text-muted">{description}</p> : null}
    </div>
  );
}

function TaxonomyFields({
  typeLevel1Options,
  typeLevel2Options,
  categoryLevel1Options,
  categoryLevel2Options,
  categoryLevel3Options,
  state,
  onChange,
}: {
  typeLevel1Options: AdminTypeLevel1[];
  typeLevel2Options: AdminTypeLevel2[];
  categoryLevel1Options: AdminCategoryLevel1[];
  categoryLevel2Options: AdminCategoryLevel2[];
  categoryLevel3Options: AdminCategoryLevel3[];
  state: TaxonomyState;
  onChange: (patch: Partial<TaxonomyState>) => void;
}) {
  const availableTypeLevel2 = useMemo(
    () => getTypeLevel2ForTypeLevel1(typeLevel2Options, state.type_lvl_1_id || null),
    [typeLevel2Options, state.type_lvl_1_id],
  );

  const selectedCategoryLevel1 = categoryLevel1Options.find((entry) => entry.name === state.category_lvl_1) ?? null;
  const availableCategoryLevel2 = useMemo(
    () => getCategoryLevel2ForCategoryLevel1(categoryLevel2Options, selectedCategoryLevel1?.id),
    [categoryLevel2Options, selectedCategoryLevel1?.id],
  );

  const selectedCategoryLevel2 = availableCategoryLevel2.find((entry) => entry.name === state.category_lvl_2) ?? null;
  const availableCategoryLevel3 = useMemo(
    () => getCategoryLevel3ForCategoryLevel2(categoryLevel3Options, selectedCategoryLevel2?.id),
    [categoryLevel3Options, selectedCategoryLevel2?.id],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Field label="Grupa">
        <select
          value={state.type_lvl_1_id}
          onChange={(event) => onChange({ type_lvl_1_id: event.target.value, type_lvl_2_id: "" })}
          className={inputClass}
        >
          <option value="">Wybierz</option>
          {typeLevel1Options.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Typ szczegółowy">
        <select
          value={state.type_lvl_2_id}
          onChange={(event) => onChange({ type_lvl_2_id: event.target.value })}
          className={inputClass}
          disabled={!state.type_lvl_1_id}
        >
          <option value="">{state.type_lvl_1_id ? "Wybierz" : "Najpierw grupa"}</option>
          {availableTypeLevel2.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Kategoria">
        <select
          value={state.category_lvl_1}
          onChange={(event) => onChange({ category_lvl_1: event.target.value, category_lvl_2: "", category_lvl_3: "" })}
          className={inputClass}
        >
          <option value="">Wybierz</option>
          {categoryLevel1Options.map((entry) => (
            <option key={entry.id} value={entry.name}>{entry.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Podkategoria">
        <select
          value={state.category_lvl_2}
          onChange={(event) => onChange({ category_lvl_2: event.target.value, category_lvl_3: "" })}
          className={inputClass}
          disabled={!state.category_lvl_1}
        >
          <option value="">{state.category_lvl_1 ? "Wybierz" : "Najpierw kategoria"}</option>
          {availableCategoryLevel2.map((entry) => (
            <option key={entry.id} value={entry.name}>{entry.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Temat">
        <select
          value={state.category_lvl_3}
          onChange={(event) => onChange({ category_lvl_3: event.target.value })}
          className={inputClass}
          disabled={!state.category_lvl_2}
        >
          <option value="">{state.category_lvl_2 ? "Wybierz" : "Najpierw podkategoria"}</option>
          {availableCategoryLevel3.map((entry) => (
            <option key={entry.id} value={entry.name}>{entry.name}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function ContactFields({
  contact,
  setContact,
}: {
  contact: ContactState;
  setContact: React.Dispatch<React.SetStateAction<ContactState>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Imię i nazwisko" required>
        <input
          value={contact.submitter_name}
          onChange={(event) => setContact((prev) => ({ ...prev, submitter_name: event.target.value }))}
          className={inputClass}
          required
        />
      </Field>
      <Field label="Email" required>
        <input
          type="email"
          value={contact.submitter_email}
          onChange={(event) => setContact((prev) => ({ ...prev, submitter_email: event.target.value }))}
          className={inputClass}
          required
        />
      </Field>
      <Field label="Telefon">
        <input
          value={contact.submitter_phone}
          onChange={(event) => setContact((prev) => ({ ...prev, submitter_phone: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <Field label="Organizacja / marka">
        <input
          value={contact.organization_name}
          onChange={(event) => setContact((prev) => ({ ...prev, organization_name: event.target.value }))}
          className={inputClass}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Dodatkowa notatka dla redakcji">
          <textarea
            value={contact.notes}
            onChange={(event) => setContact((prev) => ({ ...prev, notes: event.target.value }))}
            className={textareaClass}
          />
        </Field>
      </div>
    </div>
  );
}

function FormNotice({ message, error }: { message: string | null; error?: boolean }) {
  if (!message) return null;

  return (
    <div className={cn(
      "rounded-2xl border px-4 py-3 text-[14px] leading-6",
      error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
    )}>
      {message}
    </div>
  );
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-900 px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Wysyłanie..." : "Wyślij do sprawdzenia"}
      <Send size={15} />
    </button>
  );
}

async function submitForm(contentType: SubmissionKind, payload: unknown, contact: ContactState) {
  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, payload, contact }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error ?? "Nie udało się wysłać formularza.");
  }

  return result;
}

function EventSubmissionForm() {
  const [form, setForm] = useState<EventFormState>(EMPTY_EVENT_FORM);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options } = useAdminTaxonomy();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await submitForm("event", form, contact);
      setSuccessMessage(result.message);
      setForm(EMPTY_EVENT_FORM);
      setContact(EMPTY_CONTACT);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nie udało się wysłać formularza.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={panelClass}>
        <SectionTitle title="Szczegóły wydarzenia" description="Formularz dla wydarzeń jednorazowych, warsztatów, spektakli i innych aktywności w kalendarzu." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Tytuł" required>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Organizator">
            <input value={form.organizer} onChange={(event) => setForm((prev) => ({ ...prev, organizer: event.target.value }))} className={inputClass} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Krótki opis" required>
              <textarea value={form.description_short} onChange={(event) => setForm((prev) => ({ ...prev, description_short: event.target.value }))} className={textareaClass} required />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Pełny opis">
              <textarea value={form.description_long} onChange={(event) => setForm((prev) => ({ ...prev, description_long: event.target.value }))} className={textareaClass} />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Klasyfikacja" description="Pomaga umieścić zgłoszenie we właściwej części serwisu i filtrach." />
        <div className="mt-5 space-y-4">
          <TaxonomyFields
            typeLevel1Options={typeLevel1Options}
            typeLevel2Options={typeLevel2Options}
            categoryLevel1Options={categoryLevel1Options}
            categoryLevel2Options={categoryLevel2Options}
            categoryLevel3Options={categoryLevel3Options}
            state={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
          <div className="max-w-sm">
            <Field label="Kategoria wydarzenia" required>
              <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} className={inputClass} required>
                {EVENT_CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Termin i miejsce" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Data od" required>
            <input type="date" value={form.date_start} onChange={(event) => setForm((prev) => ({ ...prev, date_start: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Data do">
            <input type="date" value={form.date_end} onChange={(event) => setForm((prev) => ({ ...prev, date_end: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Godzina od">
            <input type="time" value={form.time_start} onChange={(event) => setForm((prev) => ({ ...prev, time_start: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Godzina do">
            <input type="time" value={form.time_end} onChange={(event) => setForm((prev) => ({ ...prev, time_end: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Dzielnica" required>
            <select value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} className={inputClass} required>
              {DISTRICT_LIST.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </Field>
          <Field label="Miejsce" required>
            <input value={form.venue_name} onChange={(event) => setForm((prev) => ({ ...prev, venue_name: event.target.value }))} className={inputClass} required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Adres" required>
              <input value={form.venue_address} onChange={(event) => setForm((prev) => ({ ...prev, venue_address: event.target.value }))} className={inputClass} required />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dodatkowe informacje" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Wiek od">
            <input type="number" min="0" value={form.age_min} onChange={(event) => setForm((prev) => ({ ...prev, age_min: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Wiek do">
            <input type="number" min="0" value={form.age_max} onChange={(event) => setForm((prev) => ({ ...prev, age_max: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Cena (zł)">
            <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} className={inputClass} disabled={form.is_free} />
          </Field>
          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[14px] text-foreground">
            <input type="checkbox" checked={form.is_free} onChange={(event) => setForm((prev) => ({ ...prev, is_free: event.target.checked, price: event.target.checked ? "" : prev.price }))} />
            Bezpłatne wydarzenie
          </label>
          <div className="md:col-span-2">
            <Field label="Link do strony źródłowej">
              <input type="url" value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Link do Facebooka">
              <input type="url" value={form.facebook_url} onChange={(event) => setForm((prev) => ({ ...prev, facebook_url: event.target.value }))} className={inputClass} placeholder="https://facebook.com/..." />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Zdjęcie (URL)">
              <input type="url" value={form.image_url} onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dane kontaktowe zgłaszającego" description="Te dane nie będą publikowane. Służą wyłącznie do weryfikacji zgłoszenia." />
        <div className="mt-5">
          <ContactFields contact={contact} setContact={setContact} />
        </div>
      </div>

      <FormNotice message={successMessage} />
      <FormNotice message={errorMessage} error />
      <div className="flex items-center gap-3">
        <SubmitButton loading={submitting} />
        {successMessage ? <span className="inline-flex items-center gap-2 text-[13px] text-emerald-700"><CheckCircle2 size={16} />Zapisane jako szkic</span> : null}
      </div>
    </form>
  );
}

function PlaceSubmissionForm() {
  const [form, setForm] = useState<PlaceFormState>(EMPTY_PLACE_FORM);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options } = useAdminTaxonomy();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await submitForm("place", form, contact);
      setSuccessMessage(result.message);
      setForm(EMPTY_PLACE_FORM);
      setContact(EMPTY_CONTACT);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nie udało się wysłać formularza.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={panelClass}>
        <SectionTitle title="Opis miejsca" description="Dla kawiarni rodzinnych, sal zabaw, placów zabaw i innych przyjaznych miejscówek." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Nazwa miejsca" required>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Typ miejsca" required>
            <select value={form.place_type} onChange={(event) => setForm((prev) => ({ ...prev, place_type: event.target.value }))} className={inputClass} required>
              {PLACE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Krótki opis" required>
              <textarea value={form.description_short} onChange={(event) => setForm((prev) => ({ ...prev, description_short: event.target.value }))} className={textareaClass} required />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Pełny opis">
              <textarea value={form.description_long} onChange={(event) => setForm((prev) => ({ ...prev, description_long: event.target.value }))} className={textareaClass} />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Klasyfikacja" />
        <div className="mt-5">
          <TaxonomyFields
            typeLevel1Options={typeLevel1Options}
            typeLevel2Options={typeLevel2Options}
            categoryLevel1Options={categoryLevel1Options}
            categoryLevel2Options={categoryLevel2Options}
            categoryLevel3Options={categoryLevel3Options}
            state={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Adres i szczegóły" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <Field label="Ulica i numer" required>
              <input value={form.street} onChange={(event) => setForm((prev) => ({ ...prev, street: event.target.value }))} className={inputClass} required />
            </Field>
          </div>
          <Field label="Miasto" required>
            <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Dzielnica" required>
            <select value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} className={inputClass} required>
              {DISTRICT_LIST.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </Field>
          <Field label="Godziny otwarcia">
            <input value={form.opening_hours} onChange={(event) => setForm((prev) => ({ ...prev, opening_hours: event.target.value }))} className={inputClass} placeholder="np. pn-pt 10:00-18:00" />
          </Field>
          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[14px] text-foreground">
            <input type="checkbox" checked={form.is_indoor} onChange={(event) => setForm((prev) => ({ ...prev, is_indoor: event.target.checked }))} />
            Miejsce pod dachem
          </label>
          <Field label="Wiek od">
            <input type="number" min="0" value={form.age_min} onChange={(event) => setForm((prev) => ({ ...prev, age_min: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Wiek do">
            <input type="number" min="0" value={form.age_max} onChange={(event) => setForm((prev) => ({ ...prev, age_max: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Cena (zł)">
            <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} className={inputClass} disabled={form.is_free} />
          </Field>
          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[14px] text-foreground">
            <input type="checkbox" checked={form.is_free} onChange={(event) => setForm((prev) => ({ ...prev, is_free: event.target.checked, price: event.target.checked ? "" : prev.price }))} />
            Bezpłatne miejsce
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Udogodnienia">
              <textarea value={form.amenities} onChange={(event) => setForm((prev) => ({ ...prev, amenities: event.target.value }))} className={textareaClass} placeholder="np. przewijak, toaleta, parking, ogródek" />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Linki i materiały" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Strona WWW">
            <input type="url" value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} className={inputClass} placeholder="https://..." />
          </Field>
          <Field label="Facebook">
            <input type="url" value={form.facebook_url} onChange={(event) => setForm((prev) => ({ ...prev, facebook_url: event.target.value }))} className={inputClass} placeholder="https://facebook.com/..." />
          </Field>
          <div className="md:col-span-2">
            <Field label="Zdjęcie (URL)">
              <input type="url" value={form.image_url} onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dane kontaktowe zgłaszającego" description="Te dane zostają tylko do weryfikacji zgłoszenia." />
        <div className="mt-5">
          <ContactFields contact={contact} setContact={setContact} />
        </div>
      </div>

      <FormNotice message={successMessage} />
      <FormNotice message={errorMessage} error />
      <div className="flex items-center gap-3">
        <SubmitButton loading={submitting} />
        {successMessage ? <span className="inline-flex items-center gap-2 text-[13px] text-emerald-700"><CheckCircle2 size={16} />Zapisane jako szkic</span> : null}
      </div>
    </form>
  );
}

function CampSubmissionForm() {
  const [form, setForm] = useState<CampFormState>(EMPTY_CAMP_FORM);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options } = useAdminTaxonomy();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await submitForm("camp", form, contact);
      setSuccessMessage(result.message);
      setForm(EMPTY_CAMP_FORM);
      setContact(EMPTY_CONTACT);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nie udało się wysłać formularza.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={panelClass}>
        <SectionTitle title="Oferta kolonii lub półkolonii" description="Formularz dla turnusów wakacyjnych, półkolonii oraz wyjazdów dla dzieci." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Nazwa oferty" required>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Organizator" required>
            <input value={form.organizer} onChange={(event) => setForm((prev) => ({ ...prev, organizer: event.target.value }))} className={inputClass} required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Krótki opis" required>
              <textarea value={form.description_short} onChange={(event) => setForm((prev) => ({ ...prev, description_short: event.target.value }))} className={textareaClass} required />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Pełny opis">
              <textarea value={form.description_long} onChange={(event) => setForm((prev) => ({ ...prev, description_long: event.target.value }))} className={textareaClass} />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Klasyfikacja" />
        <div className="mt-5">
          <TaxonomyFields
            typeLevel1Options={typeLevel1Options}
            typeLevel2Options={typeLevel2Options}
            categoryLevel1Options={categoryLevel1Options}
            categoryLevel2Options={categoryLevel2Options}
            categoryLevel3Options={categoryLevel3Options}
            state={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Termin i logistyka" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Data od" required>
            <input type="date" value={form.date_start} onChange={(event) => setForm((prev) => ({ ...prev, date_start: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Data do" required>
            <input type="date" value={form.date_end} onChange={(event) => setForm((prev) => ({ ...prev, date_end: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Liczba dni">
            <input type="number" min="1" value={form.duration_days} onChange={(event) => setForm((prev) => ({ ...prev, duration_days: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Sezon" required>
            <select value={form.season} onChange={(event) => setForm((prev) => ({ ...prev, season: event.target.value }))} className={inputClass} required>
              {CAMP_SEASON_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Dzielnica" required>
            <select value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} className={inputClass} required>
              {DISTRICT_LIST.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </Field>
          <Field label="Miejsce" required>
            <input value={form.venue_name} onChange={(event) => setForm((prev) => ({ ...prev, venue_name: event.target.value }))} className={inputClass} required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Adres" required>
              <input value={form.venue_address} onChange={(event) => setForm((prev) => ({ ...prev, venue_address: event.target.value }))} className={inputClass} required />
            </Field>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[14px] text-foreground">
            <input type="checkbox" checked={form.meals_included} onChange={(event) => setForm((prev) => ({ ...prev, meals_included: event.target.checked }))} />
            Wyżywienie w cenie
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[14px] text-foreground">
            <input type="checkbox" checked={form.transport_included} onChange={(event) => setForm((prev) => ({ ...prev, transport_included: event.target.checked }))} />
            Transport w cenie
          </label>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Cena i grupa wiekowa" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Wiek od">
            <input type="number" min="0" value={form.age_min} onChange={(event) => setForm((prev) => ({ ...prev, age_min: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Wiek do">
            <input type="number" min="0" value={form.age_max} onChange={(event) => setForm((prev) => ({ ...prev, age_max: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Cena od">
            <input type="number" min="0" step="0.01" value={form.price_from} onChange={(event) => setForm((prev) => ({ ...prev, price_from: event.target.value }))} className={inputClass} disabled={form.is_free} />
          </Field>
          <Field label="Cena do">
            <input type="number" min="0" step="0.01" value={form.price_to} onChange={(event) => setForm((prev) => ({ ...prev, price_to: event.target.value }))} className={inputClass} disabled={form.is_free} />
          </Field>
          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[14px] text-foreground">
            <input type="checkbox" checked={form.is_free} onChange={(event) => setForm((prev) => ({ ...prev, is_free: event.target.checked, price_from: event.target.checked ? "" : prev.price_from, price_to: event.target.checked ? "" : prev.price_to }))} />
            Bezpłatna oferta
          </label>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Linki i zdjęcie" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Strona WWW">
            <input type="url" value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} className={inputClass} placeholder="https://..." />
          </Field>
          <Field label="Facebook">
            <input type="url" value={form.facebook_url} onChange={(event) => setForm((prev) => ({ ...prev, facebook_url: event.target.value }))} className={inputClass} placeholder="https://facebook.com/..." />
          </Field>
          <div className="md:col-span-2">
            <Field label="Zdjęcie (URL)">
              <input type="url" value={form.image_url} onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dane kontaktowe zgłaszającego" />
        <div className="mt-5">
          <ContactFields contact={contact} setContact={setContact} />
        </div>
      </div>

      <FormNotice message={successMessage} />
      <FormNotice message={errorMessage} error />
      <div className="flex items-center gap-3">
        <SubmitButton loading={submitting} />
        {successMessage ? <span className="inline-flex items-center gap-2 text-[13px] text-emerald-700"><CheckCircle2 size={16} />Zapisane jako szkic</span> : null}
      </div>
    </form>
  );
}

function ActivitySubmissionForm() {
  const [form, setForm] = useState<ActivityFormState>(EMPTY_ACTIVITY_FORM);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options } = useAdminTaxonomy();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await submitForm("activity", form, contact);
      setSuccessMessage(result.message);
      setForm(EMPTY_ACTIVITY_FORM);
      setContact(EMPTY_CONTACT);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nie udało się wysłać formularza.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleDay(day: string) {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((item) => item !== day)
        : [...prev.days_of_week, day],
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={panelClass}>
        <SectionTitle title="Opis zajęć" description="Formularz dla kursów, warsztatów cyklicznych i zajęć pozalekcyjnych." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Nazwa zajęć" required>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Organizator" required>
            <input value={form.organizer} onChange={(event) => setForm((prev) => ({ ...prev, organizer: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Typ zajęć" required>
            <select value={form.activity_type} onChange={(event) => setForm((prev) => ({ ...prev, activity_type: event.target.value }))} className={inputClass} required>
              {ACTIVITY_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Dzielnica" required>
            <select value={form.district} onChange={(event) => setForm((prev) => ({ ...prev, district: event.target.value }))} className={inputClass} required>
              {DISTRICT_LIST.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Krótki opis" required>
              <textarea value={form.description_short} onChange={(event) => setForm((prev) => ({ ...prev, description_short: event.target.value }))} className={textareaClass} required />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Pełny opis">
              <textarea value={form.description_long} onChange={(event) => setForm((prev) => ({ ...prev, description_long: event.target.value }))} className={textareaClass} />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Klasyfikacja" />
        <div className="mt-5">
          <TaxonomyFields
            typeLevel1Options={typeLevel1Options}
            typeLevel2Options={typeLevel2Options}
            categoryLevel1Options={categoryLevel1Options}
            categoryLevel2Options={categoryLevel2Options}
            categoryLevel3Options={categoryLevel3Options}
            state={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Harmonogram i miejsce" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Opis harmonogramu">
            <input value={form.schedule_summary} onChange={(event) => setForm((prev) => ({ ...prev, schedule_summary: event.target.value }))} className={inputClass} placeholder="np. wtorki i czwartki 17:00" />
          </Field>
          <Field label="Data startu" required>
            <input type="date" value={form.date_start} onChange={(event) => setForm((prev) => ({ ...prev, date_start: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Data końca">
            <input type="date" value={form.date_end} onChange={(event) => setForm((prev) => ({ ...prev, date_end: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Godzina od">
            <input type="time" value={form.time_start} onChange={(event) => setForm((prev) => ({ ...prev, time_start: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Godzina do">
            <input type="time" value={form.time_end} onChange={(event) => setForm((prev) => ({ ...prev, time_end: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Miejsce" required>
            <input value={form.venue_name} onChange={(event) => setForm((prev) => ({ ...prev, venue_name: event.target.value }))} className={inputClass} required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Adres" required>
              <input value={form.venue_address} onChange={(event) => setForm((prev) => ({ ...prev, venue_address: event.target.value }))} className={inputClass} required />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Dni tygodnia">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {DAYS_OF_WEEK.map(([value, label]) => {
                  const selected = form.days_of_week.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-[13px] transition-colors",
                        selected ? "border-sky-300 bg-sky-50 text-sky-900" : "border-border bg-background text-foreground hover:border-sky-200",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Wiek, cena i linki" />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Wiek od">
            <input type="number" min="0" value={form.age_min} onChange={(event) => setForm((prev) => ({ ...prev, age_min: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Wiek do">
            <input type="number" min="0" value={form.age_max} onChange={(event) => setForm((prev) => ({ ...prev, age_max: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Cena od">
            <input type="number" min="0" step="0.01" value={form.price_from} onChange={(event) => setForm((prev) => ({ ...prev, price_from: event.target.value }))} className={inputClass} disabled={form.is_free} />
          </Field>
          <Field label="Cena do">
            <input type="number" min="0" step="0.01" value={form.price_to} onChange={(event) => setForm((prev) => ({ ...prev, price_to: event.target.value }))} className={inputClass} disabled={form.is_free} />
          </Field>
          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-[14px] text-foreground xl:col-span-2">
            <input type="checkbox" checked={form.is_free} onChange={(event) => setForm((prev) => ({ ...prev, is_free: event.target.checked, price_from: event.target.checked ? "" : prev.price_from, price_to: event.target.checked ? "" : prev.price_to }))} />
            Bezpłatne zajęcia
          </label>
          <Field label="Strona WWW">
            <input type="url" value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} className={inputClass} placeholder="https://..." />
          </Field>
          <Field label="Facebook">
            <input type="url" value={form.facebook_url} onChange={(event) => setForm((prev) => ({ ...prev, facebook_url: event.target.value }))} className={inputClass} placeholder="https://facebook.com/..." />
          </Field>
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Zdjęcie (URL)">
              <input type="url" value={form.image_url} onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dane kontaktowe zgłaszającego" />
        <div className="mt-5">
          <ContactFields contact={contact} setContact={setContact} />
        </div>
      </div>

      <FormNotice message={successMessage} />
      <FormNotice message={errorMessage} error />
      <div className="flex items-center gap-3">
        <SubmitButton loading={submitting} />
        {successMessage ? <span className="inline-flex items-center gap-2 text-[13px] text-emerald-700"><CheckCircle2 size={16} />Zapisane jako szkic</span> : null}
      </div>
    </form>
  );
}

export function PublicSubmissionForms({ initialTab = "event" }: { initialTab?: SubmissionKind }) {
  const [activeTab, setActiveTab] = useState<SubmissionKind>(initialTab);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(TAB_CONFIG) as SubmissionKind[]).map((tabKey) => {
          const tab = TAB_CONFIG[tabKey];
          const Icon = tab.icon;
          const selected = activeTab === tabKey;

          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              className={cn(
                "rounded-3xl border px-4 py-4 text-left transition-all duration-200",
                selected
                  ? "border-sky-300 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(236,253,255,0.98))] shadow-[0_18px_42px_-32px_rgba(2,132,199,0.4)]"
                  : "border-border bg-card hover:border-sky-200 hover:bg-sky-50/40",
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("rounded-2xl p-2.5", selected ? "bg-sky-900 text-white" : "bg-slate-100 text-slate-700")}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{tab.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-muted">{tab.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeTab === "event" ? <EventSubmissionForm /> : null}
      {activeTab === "place" ? <PlaceSubmissionForm /> : null}
      {activeTab === "camp" ? <CampSubmissionForm /> : null}
      {activeTab === "activity" ? <ActivitySubmissionForm /> : null}
    </div>
  );
}
