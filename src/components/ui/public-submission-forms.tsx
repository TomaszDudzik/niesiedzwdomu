"use client";

import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Tent, Users, Send, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISTRICT_LIST } from "@/lib/mock-data";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";
import {
  type AdminCategoryLevel1,
  type AdminCategoryLevel2,
  type AdminCategoryLevel3,
  type AdminTaxonomyResponse,
  type AdminTypeLevel1,
  type AdminTypeLevel2,
  getCategoryLevel2ForCategoryLevel1,
  getCategoryLevel3ForCategoryLevel2,
  getTypeLevel2ForTypeLevel1,
} from "@/lib/admin-taxonomy";

type SubmissionKind = "event" | "place" | "camp" | "activity";

type ContactState = {
  submitter_first_name: string;
  submitter_last_name: string;
  submitter_email: string;
  submitter_phone: string;
  submitter_phone_country_code: string;
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
  street: string;
  city: string;
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
  note: string;
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
  place: {
    title: "Miejsce",
    description: "Adres przyjazny rodzinom, do którego warto odesłać innych.",
    icon: MapPin,
  },
  event: {
    title: "Wydarzenie",
    description: "Jednorazowe lub cykliczne wydarzenia dla dzieci i rodzin.",
    icon: CalendarDays,
  },
  camp: {
    title: "Kolonie i półkolonie",
    description: "Turnusy, wyjazdy i półkolonie z ofertą dla dzieci.",
    icon: Tent,
  },
  activity: {
    title: "Zajęcia",
    description: "Regularne aktywności, kursy i zajęcia dodatkowe.",
    icon: Users,
  },
} as const;

const EMPTY_CONTACT: ContactState = {
  submitter_first_name: "",
  submitter_last_name: "",
  submitter_email: "",
  submitter_phone: "",
  submitter_phone_country_code: "+48",
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
  street: "",
  city: "Kraków",
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
  note: "",
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

const panelClass = "rounded-3xl border border-border bg-card p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.45)] md:p-5";
const labelClass = "mb-1 block text-[12px] font-medium text-foreground";
const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100";
const textareaClass = `${inputClass} min-h-[96px] resize-y`;
const sectionBodyClass = "mt-4";
const twoColumnGridClass = "mt-4 grid gap-3 md:grid-cols-2";
const detailGridClass = "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4";
const checkboxCardClass = "flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-[13px] text-foreground";

type TaxonomyState = {
  type_lvl_1_id: string;
  type_lvl_2_id: string;
  category_lvl_1: string;
  category_lvl_2: string;
  category_lvl_3: string;
};

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isFormControl(target: EventTarget | null): target is FormControl {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

function getFieldLabel(control: FormControl) {
  const label = control.closest("label");
  const text = label?.querySelector("span")?.textContent?.replace("*", "").trim();
  return text || control.getAttribute("aria-label") || "To pole";
}

function getValidationMessage(control: FormControl) {
  const { validity } = control;
  const label = getFieldLabel(control);

  if (validity.valueMissing) {
    return `Uzupełnij pole \"${label}\".`;
  }

  if (validity.typeMismatch) {
    if (control instanceof HTMLInputElement && control.type === "email") {
      return "Wpisz poprawny adres e-mail.";
    }
    if (control instanceof HTMLInputElement && control.type === "url") {
      return "Wpisz poprawny adres URL, np. https://example.com.";
    }
  }

  if (validity.badInput) {
    return `Wpisz poprawną wartość w polu \"${label}\".`;
  }

  if (validity.rangeUnderflow) {
    return `Wartość w polu \"${label}\" jest zbyt mała.`;
  }

  if (validity.rangeOverflow) {
    return `Wartość w polu \"${label}\" jest zbyt duża.`;
  }

  if (validity.stepMismatch) {
    return `Wartość w polu \"${label}\" ma niepoprawny format.`;
  }

  return control.validationMessage;
}

function syncValidationMessage(control: FormControl) {
  control.setCustomValidity("");
  if (!control.disabled && !control.validity.valid) {
    control.setCustomValidity(getValidationMessage(control));
  }
}

function getFirstInvalidControl(form: HTMLFormElement): FormControl | null {
  const controls = Array.from(form.elements).filter(isFormControl);
  for (const control of controls) {
    if (!control.disabled && !control.validity.valid) {
      return control;
    }
  }
  return null;
}

function focusFirstInvalidControl(form: HTMLFormElement) {
  const firstInvalid = getFirstInvalidControl(form);
  if (!(firstInvalid instanceof HTMLElement)) {
    return;
  }

  const scrollTarget = firstInvalid.closest("label") ?? firstInvalid;
  const topOffset = 112;
  const top = window.scrollY + scrollTarget.getBoundingClientRect().top - topOffset;

  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });

  window.setTimeout(() => {
    firstInvalid.focus({ preventScroll: true });
  }, 180);
}

function validateSubmissionForm(form: HTMLFormElement) {
  const controls = Array.from(form.elements).filter(isFormControl);
  controls.forEach(syncValidationMessage);

  if (form.checkValidity()) {
    return true;
  }

  focusFirstInvalidControl(form);
  form.reportValidity();
  return false;
}

function createFormValidationProps() {
  return {
    noValidate: true,
    onInvalidCapture: (event: React.InvalidEvent<HTMLFormElement>) => {
      if (!isFormControl(event.target)) {
        return;
      }
      syncValidationMessage(event.target);
    },
    onInputCapture: (event: React.FormEvent<HTMLFormElement>) => {
      if (!isFormControl(event.target)) {
        return;
      }
      event.target.setCustomValidity("");
    },
    onChangeCapture: (event: React.FormEvent<HTMLFormElement>) => {
      if (!isFormControl(event.target)) {
        return;
      }
      event.target.setCustomValidity("");
    },
  };
}

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
    <div className="flex min-h-[64px] flex-col justify-start gap-1">
      <h3 className="text-[17px] font-semibold text-foreground">{title}</h3>
      {description ? <p className="w-full text-[13px] leading-6 text-muted">{description}</p> : null}
    </div>
  );
}

function TaxonomyFields({
  typeLevel1Options,
  typeLevel2Options,
  categoryLevel1Options,
  categoryLevel2Options,
  categoryLevel3Options,
  taxonomyLoading = false,
  state,
  onChange,
  showTypeFields = true,
  categoryLevel1Label = "Kategoria",
  categoryLevel2Label = "Podkategoria",
  showCategoryLevel3 = true,
  categoryLevel1Required = false,
}: {
  typeLevel1Options: AdminTypeLevel1[];
  typeLevel2Options: AdminTypeLevel2[];
  categoryLevel1Options: AdminCategoryLevel1[];
  categoryLevel2Options: AdminCategoryLevel2[];
  categoryLevel3Options: AdminCategoryLevel3[];
  taxonomyLoading?: boolean;
  state: TaxonomyState;
  onChange: (patch: Partial<TaxonomyState>) => void;
  showTypeFields?: boolean;
  categoryLevel1Label?: string;
  categoryLevel2Label?: string;
  showCategoryLevel3?: boolean;
  categoryLevel1Required?: boolean;
}) {
  const availableTypeLevel2 = useMemo(
    () => getTypeLevel2ForTypeLevel1(typeLevel2Options, state.type_lvl_1_id || null),
    [typeLevel2Options, state.type_lvl_1_id],
  );

  const selectedCategoryLevel1 = categoryLevel1Options.find(
    (entry) => entry.name === state.category_lvl_1 || entry.id === state.category_lvl_1,
  ) ?? null;
  const availableCategoryLevel2 = useMemo(
    () => getCategoryLevel2ForCategoryLevel1(categoryLevel2Options, selectedCategoryLevel1?.id),
    [categoryLevel2Options, selectedCategoryLevel1?.id],
  );

  const selectedCategoryLevel2 = availableCategoryLevel2.find(
    (entry) => entry.name === state.category_lvl_2 || entry.id === state.category_lvl_2,
  ) ?? null;
  const availableCategoryLevel3 = useMemo(
    () => getCategoryLevel3ForCategoryLevel2(categoryLevel3Options, selectedCategoryLevel2?.id),
    [categoryLevel3Options, selectedCategoryLevel2?.id],
  );
  const selectedCategoryLevel3 = availableCategoryLevel3.find(
    (entry) => entry.name === state.category_lvl_3 || entry.id === state.category_lvl_3,
  ) ?? null;
  const categoryLevel1Placeholder = taxonomyLoading
    ? "Ładowanie typów..."
    : categoryLevel1Options.length > 0
      ? "Wybierz"
      : "Brak dostępnych wartości";

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", showTypeFields ? "xl:grid-cols-5" : showCategoryLevel3 ? "xl:grid-cols-3" : "xl:grid-cols-2")}>
      {showTypeFields ? (
        <>
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
        </>
      ) : null}

      <Field label={categoryLevel1Label} required={categoryLevel1Required}>
        <select
          value={selectedCategoryLevel1?.name ?? ""}
          onChange={(event) => onChange({ category_lvl_1: event.target.value, category_lvl_2: "", category_lvl_3: "" })}
          className={inputClass}
          required={categoryLevel1Required}
          disabled={taxonomyLoading || categoryLevel1Options.length === 0}
        >
          <option value="">{categoryLevel1Placeholder}</option>
          {categoryLevel1Options.map((entry) => (
            <option key={entry.id} value={entry.name}>{entry.name}</option>
          ))}
        </select>
      </Field>

      <Field label={categoryLevel2Label}>
        <select
          value={selectedCategoryLevel2?.name ?? ""}
          onChange={(event) => onChange({ category_lvl_2: event.target.value, category_lvl_3: "" })}
          className={inputClass}
          disabled={taxonomyLoading || !state.category_lvl_1}
        >
          <option value="">{state.category_lvl_1 ? "Wybierz" : `Najpierw ${categoryLevel1Label.toLowerCase()}`}</option>
          {availableCategoryLevel2.map((entry) => (
            <option key={entry.id} value={entry.name}>{entry.name}</option>
          ))}
        </select>
      </Field>

      {showCategoryLevel3 ? (
        <Field label="Temat">
          <select
            value={selectedCategoryLevel3?.name ?? ""}
            onChange={(event) => onChange({ category_lvl_3: event.target.value })}
            className={inputClass}
            disabled={taxonomyLoading || !state.category_lvl_2}
          >
            <option value="">{state.category_lvl_2 ? "Wybierz" : `Najpierw ${categoryLevel2Label.toLowerCase()}`}</option>
            {availableCategoryLevel3.map((entry) => (
              <option key={entry.id} value={entry.name}>{entry.name}</option>
            ))}
          </select>
        </Field>
      ) : null}

      {!taxonomyLoading && categoryLevel1Options.length === 0 ? (
        <p className="md:col-span-2 text-[13px] leading-6 text-rose-700 xl:col-span-full">
          Nie udało się załadować listy typów. Odśwież stronę i spróbuj ponownie.
        </p>
      ) : null}
    </div>
  );
}

function ContactFields({
  contact,
  setContact,
  showOrganizationField = true,
}: {
  contact: ContactState;
  setContact: React.Dispatch<React.SetStateAction<ContactState>>;
  showOrganizationField?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Email" required>
          <input
            type="email"
            value={contact.submitter_email}
            onChange={(event) => setContact((prev) => ({ ...prev, submitter_email: event.target.value }))}
            className={inputClass}
            required
          />
        </Field>
      </div>
      <Field label="Imię" required>
        <input
          value={contact.submitter_first_name}
          onChange={(event) => setContact((prev) => ({ ...prev, submitter_first_name: event.target.value }))}
          className={inputClass}
          required
        />
      </Field>
      <Field label="Nazwisko" required>
        <input
          value={contact.submitter_last_name}
          onChange={(event) => setContact((prev) => ({ ...prev, submitter_last_name: event.target.value }))}
          className={inputClass}
          required
        />
      </Field>
      <div className="block">
        <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2">
          <label className="block">
            <span className={labelClass}>Prefix</span>
            <input
              type="tel"
              value={contact.submitter_phone_country_code}
              onChange={(event) => {
                const rawValue = event.target.value;
                if (!rawValue) {
                  setContact((prev) => ({ ...prev, submitter_phone_country_code: "+48" }));
                  return;
                }

                const normalizedValue = rawValue.startsWith("+") ? rawValue : `+${rawValue.replace(/^\+/, "")}`;
                setContact((prev) => ({ ...prev, submitter_phone_country_code: normalizedValue }));
              }}
              className="w-full rounded-xl border border-border bg-background px-2 py-2 text-[14px] text-foreground outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="+48"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Telefon</span>
            <input
              type="tel"
              value={contact.submitter_phone}
              onChange={(event) => setContact((prev) => ({ ...prev, submitter_phone: event.target.value }))}
              className={inputClass}
              placeholder="Numer telefonu"
            />
          </label>
        </div>
      </div>
      {showOrganizationField ? (
        <Field label="Organizacja / marka" required>
          <input
            value={contact.organization_name}
            onChange={(event) => setContact((prev) => ({ ...prev, organization_name: event.target.value }))}
            className={inputClass}
            required
          />
        </Field>
      ) : null}
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

  if (!error) {
    const sparkles = [
      { className: "left-5 top-5 bg-amber-300", delay: "0s" },
      { className: "right-8 top-8 bg-sky-300", delay: "0.35s" },
      { className: "left-16 bottom-7 bg-emerald-300", delay: "0.2s" },
      { className: "right-14 bottom-10 bg-rose-300", delay: "0.5s" },
      { className: "left-1/2 top-4 bg-white/80", delay: "0.15s" },
      { className: "right-1/3 bottom-4 bg-amber-200", delay: "0.45s" },
    ];

    return (
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,#0f4c6b_0%,#14718e_45%,#f3b550_100%)] px-5 py-5 text-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.7)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.14),transparent_30%)]" />
        {sparkles.map((sparkle, index) => (
          <span
            key={index}
            className={cn("pointer-events-none absolute h-2.5 w-2.5 rounded-full opacity-80 animate-pulse", sparkle.className)}
            style={{ animationDelay: sparkle.delay }}
          />
        ))}
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/14 backdrop-blur-sm">
            <Sparkles size={22} />
          </div>
          <div className="space-y-1.5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/72">Dziękujemy</p>
            <h3 className="text-[22px] font-semibold leading-tight">Super, zgłoszenie właśnie do nas poleciało.</h3>
            <p className="max-w-2xl text-[14px] leading-6 text-white/88">{message}</p>
            <p className="text-[13px] leading-6 text-white/78">Jak tylko skończymy weryfikację, opublikujemy wpis i puścimy go dalej w świat.</p>
          </div>
        </div>
      </div>
    );
  }

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
  const normalizedPayload = typeof payload === "object" && payload !== null
    ? { ...(payload as Record<string, unknown>) }
    : payload;
  const normalizedCountryCode = (contact.submitter_phone_country_code || "+48").trim().replace(/^\+?/, "+");
  const rawPhone = contact.submitter_phone.trim();
  const normalizedPhone = rawPhone.startsWith(normalizedCountryCode)
    ? rawPhone.slice(normalizedCountryCode.length)
    : rawPhone;
  const submitterName = [contact.submitter_first_name.trim(), contact.submitter_last_name.trim()].filter(Boolean).join(" ");

  if (contentType !== "place" && typeof normalizedPayload === "object" && normalizedPayload !== null) {
    const normalizedPayloadRecord = normalizedPayload as Record<string, unknown>;
    const currentOrganizer = typeof normalizedPayloadRecord.organizer === "string" ? normalizedPayloadRecord.organizer.trim() : "";
    const fallbackOrganizer = contact.organization_name.trim() || submitterName || "";
    if (!currentOrganizer && fallbackOrganizer) {
      normalizedPayloadRecord.organizer = fallbackOrganizer;
    }
  }

  const contactToSend = {
    ...contact,
    submitter_name: submitterName,
    submitter_phone: contact.submitter_phone
      ? `${normalizedCountryCode}${normalizedPhone.replace(/^0+/, "")}`
      : "",
  };

  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, payload: normalizedPayload, contact: contactToSend }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error ?? "Nie udało się wysłać formularza.");
  }

  return result;
}

function EventSubmissionForm({ initialTaxonomy }: { initialTaxonomy: AdminTaxonomyResponse }) {
  const [form, setForm] = useState<EventFormState>(EMPTY_EVENT_FORM);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const taxonomyValidationProps = createFormValidationProps();
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading } = useAdminTaxonomy(initialTaxonomy);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateSubmissionForm(event.currentTarget)) {
      return;
    }
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
    <form onSubmit={handleSubmit} className="space-y-5" {...taxonomyValidationProps}>
      <div className={panelClass}>
        <SectionTitle title="Opis wydarzenia" description="Formularz dla wydarzeń jednorazowych, warsztatów, spektakli i innych aktywności w kalendarzu." />
        <div className={twoColumnGridClass}>
          <div>
            <Field label="Nazwa" required>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} required />
            </Field>
          </div>
          <div>
            <Field label="Organizacja / marka" required>
              <input
                value={contact.organization_name}
                onChange={(event) => setContact((prev) => ({ ...prev, organization_name: event.target.value }))}
                className={inputClass}
                required
              />
            </Field>
          </div>
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
        <SectionTitle title="Klasyfikacja" description="Dzięki temu miejsce trafi do właściwej kategorii i filtrów w serwisie." />
        <div className={sectionBodyClass}>
          <TaxonomyFields
            typeLevel1Options={typeLevel1Options}
            typeLevel2Options={typeLevel2Options}
            categoryLevel1Options={categoryLevel1Options}
            categoryLevel2Options={categoryLevel2Options}
            categoryLevel3Options={categoryLevel3Options}
            taxonomyLoading={loading}
            state={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            showTypeFields={false}
            categoryLevel1Label="Typ"
            categoryLevel2Label="Kategoria"
            showCategoryLevel3={false}
            categoryLevel1Required={true}
          />
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Linki" description="Dzięki tym informacjom użytkownik będzie mógł przejść bezpośrednio do Twojej strony. Najlepiej podaj konkretny link do wydarzenia." />
        <div className={twoColumnGridClass}>
          <Field label="Strona WWW">
            <input type="url" value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} className={inputClass} placeholder="https://..." />
          </Field>
          <Field label="Facebook">
            <input type="url" value={form.facebook_url} onChange={(event) => setForm((prev) => ({ ...prev, facebook_url: event.target.value }))} className={inputClass} placeholder="https://facebook.com/..." />
          </Field>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Adres" description="Podaj ulicę i miasto wydarzenia, tak jak mają się wyświetlać w serwisie i na mapie." />
        <div className={twoColumnGridClass}>
          <Field label="Ulica i numer" required>
            <input value={form.street} onChange={(event) => setForm((prev) => ({ ...prev, street: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Miasto" required>
            <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} className={inputClass} required />
          </Field>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Szczegóły" description="Uzupełnij termin, grupę wiekową, cenę i podstawowe informacje organizacyjne." />
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(15rem,1.2fr)]">
          <Field label="Kategoria wydarzenia" required>
            <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} className={inputClass} required>
              {EVENT_CATEGORY_OPTIONS.map(([value, label]) => (
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
          <Field label="Wiek od">
            <input type="number" min="0" value={form.age_min} onChange={(event) => setForm((prev) => ({ ...prev, age_min: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Wiek do">
            <input type="number" min="0" value={form.age_max} onChange={(event) => setForm((prev) => ({ ...prev, age_max: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Cena (zł)">
            <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} className={inputClass} disabled={form.is_free} />
          </Field>
          <label className={checkboxCardClass}>
            <input type="checkbox" checked={form.is_free} onChange={(event) => setForm((prev) => ({ ...prev, is_free: event.target.checked, price: event.target.checked ? "" : prev.price }))} />
            Bezpłatne wydarzenie
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Zdjęcie (URL)">
              <input type="url" value={form.image_url} onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dane kontaktowe zgłaszającego" description="Te dane zostają tylko do weryfikacji zgłoszenia." />
        <div className={sectionBodyClass}>
          <ContactFields contact={contact} setContact={setContact} showOrganizationField={false} />
        </div>
      </div>

      <FormNotice message={successMessage} />
      <FormNotice message={errorMessage} error />
      <div className="flex items-center gap-3">
        <SubmitButton loading={submitting} />
      </div>
    </form>
  );
}

function PlaceSubmissionForm({ initialTaxonomy }: { initialTaxonomy: AdminTaxonomyResponse }) {
  const [form, setForm] = useState<PlaceFormState>(EMPTY_PLACE_FORM);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const taxonomyValidationProps = createFormValidationProps();
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading } = useAdminTaxonomy(initialTaxonomy);
  const defaultPlaceTypeLevel1Id = useMemo(
    () => typeLevel1Options.find((entry) => entry.name === "Dzieci")?.id ?? "",
    [typeLevel1Options],
  );
  const defaultPlaceTypeLevel2Id = useMemo(
    () => typeLevel2Options.find((entry) => entry.name === "Miejsca" && entry.type_lvl_1_id === defaultPlaceTypeLevel1Id)?.id
      ?? typeLevel2Options.find((entry) => entry.name === "Miejsca")?.id
      ?? "",
    [typeLevel2Options, defaultPlaceTypeLevel1Id],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateSubmissionForm(event.currentTarget)) {
      return;
    }
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await submitForm("place", {
        ...form,
        type_lvl_1_id: defaultPlaceTypeLevel1Id,
        type_lvl_2_id: defaultPlaceTypeLevel2Id,
      }, contact);
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
    <form onSubmit={handleSubmit} className="space-y-5" {...taxonomyValidationProps}>
      <div className={panelClass}>
        <SectionTitle title="Opis miejsca" description="Formularz dla sal zabaw, muzeów, parków, kawiarni rodzinnych i innych miejsc przyjaznych dzieciom." />
        <div className={twoColumnGridClass}>
          <div>
            <Field label="Nazwa" required>
              <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} required />
            </Field>
          </div>
          <div>
            <Field label="Organizacja / marka" required>
              <input
                value={contact.organization_name}
                onChange={(event) => setContact((prev) => ({ ...prev, organization_name: event.target.value }))}
                className={inputClass}
                required
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Krótki opis" required>
              <textarea value={form.description_short} onChange={(event) => setForm((prev) => ({ ...prev, description_short: event.target.value }))} className={textareaClass} required />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Pełny opis" required>
              <textarea value={form.description_long} onChange={(event) => setForm((prev) => ({ ...prev, description_long: event.target.value }))} className={textareaClass} required />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Klasyfikacja" description="Dzięki temu miejsce trafi do właściwej kategorii i filtrów w serwisie." />
        <div className={sectionBodyClass}>
          <TaxonomyFields
            typeLevel1Options={typeLevel1Options}
            typeLevel2Options={typeLevel2Options}
            categoryLevel1Options={categoryLevel1Options}
            categoryLevel2Options={categoryLevel2Options}
            categoryLevel3Options={categoryLevel3Options}
            taxonomyLoading={loading}
            state={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            showTypeFields={false}
            categoryLevel1Label="Typ"
            categoryLevel2Label="Kategoria"
            showCategoryLevel3={false}
            categoryLevel1Required={true}
          />
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Linki" description="Dzięki tym informacjom użytkownik będzie mógł przejść bezpośrednio do Twojej strony. Najlepiej podaj konkretny link do miejsca." />
        <div className={twoColumnGridClass}>
          <Field label="Strona WWW">
            <input type="url" value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} className={inputClass} placeholder="https://..." />
          </Field>
          <Field label="Facebook">
            <input type="url" value={form.facebook_url} onChange={(event) => setForm((prev) => ({ ...prev, facebook_url: event.target.value }))} className={inputClass} placeholder="https://facebook.com/..." />
          </Field>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Adres" description="Podaj dokładny adres miejsca, który rodzice zobaczą na liście i stronie wpisu." />
        <div className={twoColumnGridClass}>
          <Field label="Ulica i numer" required>
            <input value={form.street} onChange={(event) => setForm((prev) => ({ ...prev, street: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Miasto" required>
            <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} className={inputClass} required />
          </Field>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Szczegóły" description="Uzupełnij przedział wieku, określ czy miejsce jest wewnątrz czy na zewnątrz i dodaj ważne dodatkowe informacje." />
        <div className={detailGridClass}>
          <Field label="Wiek od">
            <input type="number" min="0" value={form.age_min} onChange={(event) => setForm((prev) => ({ ...prev, age_min: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Wiek do">
            <input type="number" min="0" value={form.age_max} onChange={(event) => setForm((prev) => ({ ...prev, age_max: event.target.value }))} className={inputClass} />
          </Field>
          <div>
            <span className={labelClass}>Gdzie znajduje się miejsce</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, is_indoor: true }))}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
                  form.is_indoor
                    ? "border-sky-900 bg-sky-900 text-white"
                    : "border-border bg-background text-foreground hover:border-sky-300"
                )}
              >
                Wewnątrz
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, is_indoor: false }))}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
                  !form.is_indoor
                    ? "border-sky-900 bg-sky-900 text-white"
                    : "border-border bg-background text-foreground hover:border-sky-300"
                )}
              >
                Na zewnątrz
              </button>
            </div>
          </div>
          <div className="md:col-span-3">
            <Field label="Notatka">
              <textarea
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                className={textareaClass}
                placeholder="Tutaj wpisz dodatkowe informacje, np. ważne zasady, warunki wejścia, parking, toaleta albo inne rzeczy, które rodzic powinien wiedzieć."
              />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dane kontaktowe zgłaszającego" description="Te dane zostają tylko do weryfikacji zgłoszenia." />
        <div className={sectionBodyClass}>
          <ContactFields contact={contact} setContact={setContact} showOrganizationField={false} />
        </div>
      </div>

      <FormNotice message={successMessage} />
      <FormNotice message={errorMessage} error />
      <div className="flex items-center gap-3">
        <SubmitButton loading={submitting} />
      </div>
    </form>
  );
}

function CampSubmissionForm({ initialTaxonomy }: { initialTaxonomy: AdminTaxonomyResponse }) {
  const [form, setForm] = useState<CampFormState>(EMPTY_CAMP_FORM);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const taxonomyValidationProps = createFormValidationProps();
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading } = useAdminTaxonomy(initialTaxonomy);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateSubmissionForm(event.currentTarget)) {
      return;
    }
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
    <form onSubmit={handleSubmit} className="space-y-5" {...taxonomyValidationProps}>
      <div className={panelClass}>
        <SectionTitle title="Opis oferty" description="Formularz dla turnusów wakacyjnych, półkolonii oraz wyjazdów dla dzieci." />
        <div className={twoColumnGridClass}>
          <div>
            <Field label="Nazwa" required>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} required />
            </Field>
          </div>
          <div>
            <Field label="Organizacja / marka" required>
              <input
                value={contact.organization_name}
                onChange={(event) => setContact((prev) => ({ ...prev, organization_name: event.target.value }))}
                className={inputClass}
                required
              />
            </Field>
          </div>
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
        <SectionTitle title="Klasyfikacja" description="Dzięki temu miejsce trafi do właściwej kategorii i filtrów w serwisie." />
        <div className={sectionBodyClass}>
          <TaxonomyFields
            typeLevel1Options={typeLevel1Options}
            typeLevel2Options={typeLevel2Options}
            categoryLevel1Options={categoryLevel1Options}
            categoryLevel2Options={categoryLevel2Options}
            categoryLevel3Options={categoryLevel3Options}
            taxonomyLoading={loading}
            state={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            showTypeFields={false}
            categoryLevel1Label="Typ"
            categoryLevel2Label="Kategoria"
            showCategoryLevel3={false}
            categoryLevel1Required={true}
          />
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Linki" description="Dzięki tym informacjom użytkownik będzie mógł przejść bezpośrednio do Twojej strony. Najlepiej podaj konkretny link do oferty." />
        <div className={twoColumnGridClass}>
          <Field label="Strona WWW">
            <input type="url" value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} className={inputClass} placeholder="https://..." />
          </Field>
          <Field label="Facebook">
            <input type="url" value={form.facebook_url} onChange={(event) => setForm((prev) => ({ ...prev, facebook_url: event.target.value }))} className={inputClass} placeholder="https://facebook.com/..." />
          </Field>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Adres" description="Wpisz miejsce realizacji oferty, tak jak powinno pojawić się w publikacji." />
        <div className={twoColumnGridClass}>
          <Field label="Miejsce" required>
            <input value={form.venue_name} onChange={(event) => setForm((prev) => ({ ...prev, venue_name: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Adres" required>
            <input value={form.venue_address} onChange={(event) => setForm((prev) => ({ ...prev, venue_address: event.target.value }))} className={inputClass} required />
          </Field>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Szczegóły" description="Uzupełnij termin, sezon, wiek uczestników, cenę oraz elementy oferty." />
        <div className={detailGridClass}>
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
          <label className={checkboxCardClass}>
            <input type="checkbox" checked={form.is_free} onChange={(event) => setForm((prev) => ({ ...prev, is_free: event.target.checked, price_from: event.target.checked ? "" : prev.price_from, price_to: event.target.checked ? "" : prev.price_to }))} />
            Bezpłatna oferta
          </label>
          <label className={checkboxCardClass}>
            <input type="checkbox" checked={form.meals_included} onChange={(event) => setForm((prev) => ({ ...prev, meals_included: event.target.checked }))} />
            Wyżywienie w cenie
          </label>
          <label className={checkboxCardClass}>
            <input type="checkbox" checked={form.transport_included} onChange={(event) => setForm((prev) => ({ ...prev, transport_included: event.target.checked }))} />
            Transport w cenie
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Zdjęcie (URL)">
              <input type="url" value={form.image_url} onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dane kontaktowe zgłaszającego" description="Te dane zostają tylko do weryfikacji zgłoszenia." />
        <div className={sectionBodyClass}>
          <ContactFields contact={contact} setContact={setContact} showOrganizationField={false} />
        </div>
      </div>

      <FormNotice message={successMessage} />
      <FormNotice message={errorMessage} error />
      <div className="flex items-center gap-3">
        <SubmitButton loading={submitting} />
      </div>
    </form>
  );
}

function ActivitySubmissionForm({ initialTaxonomy }: { initialTaxonomy: AdminTaxonomyResponse }) {
  const [form, setForm] = useState<ActivityFormState>(EMPTY_ACTIVITY_FORM);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const taxonomyValidationProps = createFormValidationProps();
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading } = useAdminTaxonomy(initialTaxonomy);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateSubmissionForm(event.currentTarget)) {
      return;
    }
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
    <form onSubmit={handleSubmit} className="space-y-5" {...taxonomyValidationProps}>
      <div className={panelClass}>
        <SectionTitle title="Opis zajęć" description="Formularz dla kursów, warsztatów cyklicznych i zajęć pozalekcyjnych." />
        <div className={twoColumnGridClass}>
          <div>
            <Field label="Nazwa" required>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={inputClass} required />
            </Field>
          </div>
          <div>
            <Field label="Organizacja / marka" required>
              <input
                value={contact.organization_name}
                onChange={(event) => setContact((prev) => ({ ...prev, organization_name: event.target.value }))}
                className={inputClass}
                required
              />
            </Field>
          </div>
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
        <SectionTitle title="Klasyfikacja" description="Dzięki temu miejsce trafi do właściwej kategorii i filtrów w serwisie." />
        <div className={sectionBodyClass}>
          <TaxonomyFields
            typeLevel1Options={typeLevel1Options}
            typeLevel2Options={typeLevel2Options}
            categoryLevel1Options={categoryLevel1Options}
            categoryLevel2Options={categoryLevel2Options}
            categoryLevel3Options={categoryLevel3Options}
            taxonomyLoading={loading}
            state={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            showTypeFields={false}
            categoryLevel1Label="Typ"
            categoryLevel2Label="Kategoria"
            showCategoryLevel3={false}
            categoryLevel1Required={true}
          />
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Linki" description="Dzięki tym informacjom użytkownik będzie mógł przejść bezpośrednio do Twojej strony. Najlepiej podaj konkretny link do zajęć." />
        <div className={twoColumnGridClass}>
          <Field label="Strona WWW">
            <input type="url" value={form.source_url} onChange={(event) => setForm((prev) => ({ ...prev, source_url: event.target.value }))} className={inputClass} placeholder="https://..." />
          </Field>
          <Field label="Facebook">
            <input type="url" value={form.facebook_url} onChange={(event) => setForm((prev) => ({ ...prev, facebook_url: event.target.value }))} className={inputClass} placeholder="https://facebook.com/..." />
          </Field>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Adres" description="Podaj nazwę miejsca i adres, pod którym faktycznie odbywają się zajęcia." />
        <div className={twoColumnGridClass}>
          <Field label="Miejsce" required>
            <input value={form.venue_name} onChange={(event) => setForm((prev) => ({ ...prev, venue_name: event.target.value }))} className={inputClass} required />
          </Field>
          <Field label="Adres" required>
            <input value={form.venue_address} onChange={(event) => setForm((prev) => ({ ...prev, venue_address: event.target.value }))} className={inputClass} required />
          </Field>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Szczegóły" description="Uzupełnij harmonogram, grupę wiekową, cenę i sposób prowadzenia zajęć." />
        <div className={detailGridClass}>
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
          <label className={`${checkboxCardClass} xl:col-span-2`}>
            <input type="checkbox" checked={form.is_free} onChange={(event) => setForm((prev) => ({ ...prev, is_free: event.target.checked, price_from: event.target.checked ? "" : prev.price_from, price_to: event.target.checked ? "" : prev.price_to }))} />
            Bezpłatne zajęcia
          </label>
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
          <div className="md:col-span-2 xl:col-span-4">
            <Field label="Zdjęcie (URL)">
              <input type="url" value={form.image_url} onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <SectionTitle title="Dane kontaktowe zgłaszającego" description="Te dane zostają tylko do weryfikacji zgłoszenia." />
        <div className={sectionBodyClass}>
          <ContactFields contact={contact} setContact={setContact} showOrganizationField={false} />
        </div>
      </div>

      <FormNotice message={successMessage} />
      <FormNotice message={errorMessage} error />
      <div className="flex items-center gap-3">
        <SubmitButton loading={submitting} />
      </div>
    </form>
  );
}

export function PublicSubmissionForms({
  initialTab = "event",
  initialTaxonomy,
}: {
  initialTab?: SubmissionKind;
  initialTaxonomy: AdminTaxonomyResponse;
}) {
  const [activeTab, setActiveTab] = useState<SubmissionKind>(initialTab);

  return (
    <div className="space-y-5">
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
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
                "flex h-full items-start rounded-3xl border px-3.5 py-3.5 text-left transition-all duration-200",
                selected
                  ? "border-sky-300 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(236,253,255,0.98))] shadow-[0_18px_42px_-32px_rgba(2,132,199,0.4)]"
                  : "border-border bg-card hover:border-sky-200 hover:bg-sky-50/40",
              )}
            >
              <div className="flex w-full items-start gap-3">
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

      {activeTab === "event" ? <EventSubmissionForm initialTaxonomy={initialTaxonomy} /> : null}
      {activeTab === "place" ? <PlaceSubmissionForm initialTaxonomy={initialTaxonomy} /> : null}
      {activeTab === "camp" ? <CampSubmissionForm initialTaxonomy={initialTaxonomy} /> : null}
      {activeTab === "activity" ? <ActivitySubmissionForm initialTaxonomy={initialTaxonomy} /> : null}
    </div>
  );
}
