import type {
  Event, Camp, Place, DiscoveryItem,
  EventCategory, CampType, CampSeason, PlaceType, ContentType, ActivityType,
} from "@/types/database";

// ============================================
// Helpers
// ============================================

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

// ============================================
// Events (12 items)
// ============================================

export const mockEvents: Event[] = [
  {
    id: "e1", content_type: "event", title: "Bajkowa Niedziela — Teatr Lalek", slug: "bajkowa-niedziela-teatr-lalek",
    description_short: "Magiczny spektakl lalkowy dla najmłodszych widzów. Kolorowe kukiełki opowiedzą historię o przyjaźni i odwadze.",
    description_long: "Zapraszamy na wyjątkowy spektakl lalkowy w Teatrze Groteska! Przedstawienie Bajkowa Niedziela to pełna kolorów i muzyki opowieść o dwóch przyjaciołach, którzy wyruszają w niezwykłą podróż. Spektakl trwa 45 minut i jest idealny dla dzieci w wieku 3-7 lat.\n\nPo przedstawieniu dzieci będą mogły spotkać się z aktorami i zobaczyć lalki z bliska.\n\nBilety dostępne w kasie teatru oraz online.",
    image_url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=500&fit=crop",
    date_start: futureDate(2), date_end: null, time_start: "11:00", time_end: "11:45",
    age_min: 3, age_max: 7, price: 25, is_free: false, category: "spektakl", district: "Stare Miasto",
venue_name: "Teatr Groteska", lat: null, lng: null, venue_address: "ul. Skarbowa 2, Kraków",
    source_url: "https://groteska.pl", facebook_url: null, organizer: "Teatr Groteska",
    is_featured: true, status: "published", likes: 34, dislikes: 2,
    created_at: "2024-01-15T10:00:00Z", updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "e2", content_type: "event", title: "Warsztaty Małego Konstruktora", slug: "warsztaty-malego-konstruktora",
    description_short: "Budowanie, eksperymentowanie i zabawa! Warsztaty STEM dla ciekawskich dzieci w sercu Kazimierza.",
    description_long: "Muzeum Inżynierii Miejskiej zaprasza na warsztaty Mały Konstruktor! Dzieci będą budować mosty z patyczków, testować proste maszyny i odkrywać prawa fizyki przez zabawę.\n\nZajęcia prowadzą doświadczeni edukatorzy. Wszystkie materiały zapewnione. Grupy do 12 osób.\n\nWymagana wcześniejsza rezerwacja.",
    image_url: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&h=500&fit=crop",
    date_start: futureDate(3), date_end: null, time_start: "10:00", time_end: "12:00",
    age_min: 5, age_max: 10, price: 35, is_free: false, category: "warsztaty", district: "Kazimierz",
venue_name: "Muzeum Inżynierii Miejskiej", lat: null, lng: null, venue_address: "ul. Św. Wawrzyńca 15, Kraków",
    source_url: null, facebook_url: null, organizer: "Muzeum Inżynierii Miejskiej",
    is_featured: true, status: "published", likes: 28, dislikes: 1,
    created_at: "2024-01-14T10:00:00Z", updated_at: "2024-01-14T10:00:00Z",
  },
  {
    id: "e3", content_type: "event", title: "Piknik Rodzinny w Parku Jordana", slug: "piknik-rodzinny-park-jordana",
    description_short: "Darmowy piknik z animacjami, muzyką na żywo i strefą zabaw dla całej rodziny.",
    description_long: "Wielki Piknik Rodzinny w Parku Jordana to coroczna tradycja!\n\n- Strefa zabaw dla maluchów (0-3 lata)\n- Gry i konkursy dla starszych dzieci\n- Muzyka na żywo\n- Warsztaty plastyczne\n- Food trucki z jedzeniem\n- Pokazy bańkowe\n\nWstęp wolny!",
    image_url: "https://images.unsplash.com/photo-1540479859555-17af45c78602?w=800&h=500&fit=crop",
    date_start: futureDate(5), date_end: null, time_start: "10:00", time_end: "16:00",
    age_min: 0, age_max: 12, price: null, is_free: true, category: "festyn", district: "Krowodrza",
venue_name: "Park Jordana", lat: null, lng: null, venue_address: "al. 3 Maja, Kraków",
    source_url: null, facebook_url: null, organizer: "Urząd Miasta Krakowa",
    is_featured: true, status: "published", likes: 67, dislikes: 3,
    created_at: "2024-01-13T10:00:00Z", updated_at: "2024-01-13T10:00:00Z",
  },
  {
    id: "e4", content_type: "event", title: "Koncert Kołysanek — Muzyka Klasyczna dla Bobasa", slug: "koncert-kolysanek-muzyka-klasyczna",
    description_short: "Kameralne koncerty muzyki klasycznej zaprojektowane specjalnie dla niemowląt i małych dzieci.",
    description_long: "Cykl Muzyka dla Bobasa to kameralne koncerty, podczas których maluszki mogą swobodnie raczkować, bawić się i słuchać na żywo muzyki Mozarta, Vivaldiego i Chopina.\n\nKoncerty trwają 30-35 minut. Sala jest przystosowana: miękkie maty, przytłumione światło.\n\nMaksymalnie 20 rodzin na koncercie.",
    image_url: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=500&fit=crop",
    date_start: futureDate(1), date_end: null, time_start: "10:30", time_end: "11:05",
    age_min: 0, age_max: 3, price: 40, is_free: false, category: "muzyka", district: "Dębniki",
venue_name: "ICE Kraków — Sala Kameralna", lat: null, lng: null, venue_address: "ul. Marii Konopnickiej 17, Kraków",
    source_url: "https://icekrakow.pl", facebook_url: null, organizer: "Filharmonia dla Dzieci",
    is_featured: false, status: "published", likes: 45, dislikes: 0,
    created_at: "2024-01-12T10:00:00Z", updated_at: "2024-01-12T10:00:00Z",
  },
  {
    id: "e5", content_type: "event", title: "Eksploratorium Lema — Sobotnie Eksperymenty", slug: "eksploratorium-lema-sobotnie-eksperymenty",
    description_short: "Interaktywne eksperymenty naukowe dla dzieci. Każda sobota to nowy temat!",
    description_long: "Ogród Doświadczeń im. Stanisława Lema zaprasza na cykl sobotnich warsztatów naukowych. Temat tygodnia: Dlaczego niebo jest niebieskie? Eksperymenty z optyki i światła.\n\nDzieci samodzielnie przeprowadzą eksperymenty pod okiem edukatora.\n\nZajęcia odbywają się w laboratorium edukacyjnym.",
    image_url: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&h=500&fit=crop",
    date_start: futureDate(4), date_end: null, time_start: "11:00", time_end: "13:00",
    age_min: 6, age_max: 12, price: 20, is_free: false, category: "edukacja", district: "Nowa Huta",
venue_name: "Ogród Doświadczeń im. S. Lema", lat: null, lng: null, venue_address: "al. Pokoju 68, Kraków",
    source_url: null, facebook_url: null, organizer: "Ogród Doświadczeń",
    is_featured: false, status: "published", likes: 19, dislikes: 1,
    created_at: "2024-01-11T10:00:00Z", updated_at: "2024-01-11T10:00:00Z",
  },
  {
    id: "e6", content_type: "event", title: "Joga Rodzinna w Parku Bednarskiego", slug: "joga-rodzinna-park-bednarskiego",
    description_short: "Poranne zajęcia jogi dla rodziców z dziećmi. Ruch, oddech i wspólna zabawa na świeżym powietrzu.",
    description_long: "Dołącz do porannej sesji jogi rodzinnej w pięknym Parku Bednarskiego!\n\nProgram obejmuje:\n- Zabawowe pozycje jogi\n- Ćwiczenia oddechowe\n- Relaksację z muzyką\n- Krótką medytację\n\nWeź ze sobą matę lub koc. Wstęp wolny, zapisy online.",
    image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop",
    date_start: futureDate(6), date_end: null, time_start: "09:00", time_end: "10:00",
    age_min: 3, age_max: 10, price: null, is_free: true, category: "sport", district: "Podgórze",
venue_name: "Park Bednarskiego", lat: null, lng: null, venue_address: "ul. Parkowa, Kraków",
    source_url: null, facebook_url: null, organizer: "Joga Kraków Kids",
    is_featured: false, status: "published", likes: 22, dislikes: 0,
    created_at: "2024-01-10T10:00:00Z", updated_at: "2024-01-10T10:00:00Z",
  },
  {
    id: "e7", content_type: "event", title: "Filmowe Poranki — Kino dla Dzieci", slug: "filmowe-poranki-kino-dla-dzieci",
    description_short: "Niedzielne seanse filmów animowanych w kameralnym kinie. Popcorn i sok w cenie biletu!",
    description_long: "Kino Pod Baranami zaprasza na cykl Filmowe Poranki — specjalne seanse animacji dla dzieci w każdą niedzielę o 10:00.\n\nW cenie biletu:\n- Popcorn\n- Sok owocowy\n- Kolorowanka\n\nSala kameralna, max 50 osób. Warto rezerwować wcześniej!",
    image_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=500&fit=crop",
    date_start: futureDate(7), date_end: null, time_start: "10:00", time_end: "11:45",
    age_min: 4, age_max: 10, price: 15, is_free: false, category: "kino", district: "Stare Miasto",
venue_name: "Kino Pod Baranami", lat: null, lng: null, venue_address: "Rynek Główny 27, Kraków",
    source_url: null, facebook_url: null, organizer: "Kino Pod Baranami",
    is_featured: true, status: "published", likes: 51, dislikes: 2,
    created_at: "2024-01-09T10:00:00Z", updated_at: "2024-01-09T10:00:00Z",
  },
  {
    id: "e8", content_type: "event", title: "Warsztaty Ceramiczne — Lepimy z Gliny", slug: "warsztaty-ceramiczne-lepimy-z-gliny",
    description_short: "Kreatywne warsztaty ceramiczne dla dzieci. Każdy zabiera swoją pracę do domu!",
    description_long: "Pracownia Ceramiczna Glinianka zaprasza na warsztaty lepienia z gliny!\n\nDzieci stworzą własne miseczki, kubki lub figurki pod okiem doświadczonego ceramika.\n\nWszystkie materiały w cenie. Grupy max 8 osób.",
    image_url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=500&fit=crop",
    date_start: futureDate(3), date_end: null, time_start: "14:00", time_end: "16:00",
    age_min: 5, age_max: 12, price: 55, is_free: false, category: "warsztaty", district: "Kazimierz",
venue_name: "Pracownia Glinianka", lat: null, lng: null, venue_address: "ul. Józefa 18, Kraków",
    source_url: null, facebook_url: null, organizer: "Pracownia Glinianka",
    is_featured: false, status: "published", likes: 38, dislikes: 1,
    created_at: "2024-01-08T10:00:00Z", updated_at: "2024-01-08T10:00:00Z",
  },
  {
    id: "e9", content_type: "event", title: "Zwiedzanie Kopalni Soli — Trasa Rodzinna", slug: "zwiedzanie-kopalni-soli-trasa-rodzinna",
    description_short: "Specjalna trasa dla rodzin z dziećmi w Kopalni Soli Wieliczka. Z przewodnikiem i quizem!",
    description_long: "Kopalnia Soli Wieliczka przygotowała specjalną trasę rodzinną! Trasa jest krótsza niż standardowa (ok. 90 min).\n\n- Interaktywny quiz z nagrodami\n- Stacje dotykowe\n- Opowieści i legendy\n- Podziemny plac zabaw\n\nDzieci poniżej 4 lat wchodzą bezpłatnie. Bilety wyłącznie online.",
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop",
    date_start: futureDate(8), date_end: futureDate(9), time_start: "09:00", time_end: "15:00",
    age_min: 4, age_max: 14, price: 30, is_free: false, category: "edukacja", district: "Inne",
venue_name: "Kopalnia Soli Wieliczka", lat: null, lng: null, venue_address: "ul. Daniłowicza 10, Wieliczka",
    source_url: null, facebook_url: null, organizer: "Kopalnia Soli Wieliczka",
    is_featured: false, status: "published", likes: 73, dislikes: 5,
    created_at: "2024-01-07T10:00:00Z", updated_at: "2024-01-07T10:00:00Z",
  },
  {
    id: "e10", content_type: "event", title: "Bajkowe Czytanie w Bibliotece", slug: "bajkowe-czytanie-w-bibliotece",
    description_short: "Głośne czytanie bajek dla maluchów. Z elementami teatrzyku i piosenek.",
    description_long: "Wojewódzka Biblioteka Publiczna zaprasza na Bajkowe Czytanie.\n\nKażde spotkanie to:\n- Głośne czytanie wybranej bajki\n- Mini teatrzyk z kukiełkami\n- Wspólne piosenki\n- Prosta praca plastyczna\n\nSpotkania trwają ok. 40 minut. Wstęp wolny, bez rezerwacji.",
    image_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=500&fit=crop",
    date_start: futureDate(1), date_end: null, time_start: "16:00", time_end: "16:40",
    age_min: 2, age_max: 5, price: null, is_free: true, category: "edukacja", district: "Stare Miasto",
venue_name: "Wojewódzka Biblioteka Publiczna", lat: null, lng: null, venue_address: "ul. Rajska 1, Kraków",
    source_url: null, facebook_url: null, organizer: "WBP Kraków",
    is_featured: false, status: "published", likes: 15, dislikes: 0,
    created_at: "2024-01-06T10:00:00Z", updated_at: "2024-01-06T10:00:00Z",
  },
  {
    id: "e11", content_type: "event", title: "Spacer Przyrodniczy — Ptaki Krakowa", slug: "spacer-przyrodniczy-ptaki-krakowa",
    description_short: "Rodzinny spacer z ornitologiem po Błoniach. Lornetki dla każdego uczestnika!",
    description_long: "Poznaj ptaki, które mieszkają w Krakowie!\n\nKażdy uczestnik otrzyma:\n- Lornetkę na czas spaceru\n- Kartę obserwatora z naklejkami\n- Certyfikat Małego Ornitologa\n\nSpacer trwa ok. 1,5h, dystans ~2 km. Zapisy: 5-15 rodzin.",
    image_url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=500&fit=crop",
    date_start: futureDate(6), date_end: null, time_start: "09:30", time_end: "11:00",
    age_min: 5, age_max: 12, price: 15, is_free: false, category: "natura", district: "Krowodrza",
venue_name: "Błonia Krakowskie", lat: null, lng: null, venue_address: "Błonia, Kraków",
    source_url: null, facebook_url: null, organizer: "EkoKraków",
    is_featured: false, status: "published", likes: 29, dislikes: 0,
    created_at: "2024-01-05T10:00:00Z", updated_at: "2024-01-05T10:00:00Z",
  },
  {
    id: "e12", content_type: "event", title: "Festiwal Baniek Mydlanych", slug: "festiwal-baniek-mydlanych",
    description_short: "Magiczny festiwal z gigantycznymi bańkami mydlanymi, warsztatami i pokazami!",
    description_long: "Największy festiwal baniek mydlanych w Krakowie wraca!\n\nAtrakcje:\n- Gigantyczne bańki mydlane\n- Warsztaty robienia bańek\n- Tunel bańkowy\n- Pokaz świetlny z bańkami\n- Strefa maluchów (0-3 lata)\n- Konkursy z nagrodami\n\nWstęp wolny!",
    image_url: "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800&h=500&fit=crop",
    date_start: futureDate(10), date_end: futureDate(11), time_start: "10:00", time_end: "21:00",
    age_min: 0, age_max: 99, price: null, is_free: true, category: "festyn", district: "Stare Miasto",
venue_name: "Rynek Główny", lat: null, lng: null, venue_address: "Rynek Główny, Kraków",
    source_url: null, facebook_url: null, organizer: "Kraków dla Dzieci",
    is_featured: true, status: "published", likes: 112, dislikes: 4,
    created_at: "2024-01-04T10:00:00Z", updated_at: "2024-01-04T10:00:00Z",
  },
];

// ============================================
// Camps (6 items)
// ============================================

export const mockCamps: Camp[] = [
  {
    id: "c1", content_type: "camp",
    title: "Letni Obóz Odkrywców — Przygoda w Naturze",
    slug: "letni-oboz-odkrywcow-przygoda-w-naturze",
    description_short: "Dwutygodniowy obóz na świeżym powietrzu. Survival, przyroda, integracja i dużo zabawy!",
    description_long: "Obóz Odkrywców to dwa tygodnie pełne przygód w malowniczych okolicach Krakowa.\n\nProgram:\n- Zajęcia survivalowe\n- Rozpoznawanie roślin i zwierząt\n- Ogniska i nocne obserwacje gwiazd\n- Kajakowanie i wspinaczka\n- Integracja i gry zespołowe\n\nCałodzienne wyżywienie (3 posiłki + przekąski). Transport z centrum Krakowa w cenie.",
    image_url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=500&fit=crop",
    date_start: futureDate(30), date_end: futureDate(44),
    camp_type: "kolonie", season: "lato", duration_days: 14,
    meals_included: true, transport_included: true,
    age_min: 8, age_max: 14, price: 2800, is_free: false,
    district: "Inne", venue_name: "Ośrodek Przygoda", venue_address: "Pcim, okolice Krakowa",
    organizer: "Fundacja AktywniRodzice", source_url: null, facebook_url: null,
    is_featured: true, status: "published", likes: 42, dislikes: 1,
    created_at: "2024-02-01T10:00:00Z", updated_at: "2024-02-01T10:00:00Z",
  },
  {
    id: "c2", content_type: "camp",
    title: "Półkolonie Artystyczne — Mały Artysta",
    slug: "polkolonie-artystyczne-maly-artysta",
    description_short: "Tydzień twórczych warsztatów: malarstwo, rzeźba, ceramika i animacja filmowa.",
    description_long: "Półkolonie Artystyczne to 5 dni kreatywnej zabawy w sercu Kazimierza!\n\nKażdy dzień to inna technika:\n- Poniedziałek: malarstwo akrylowe\n- Wtorek: rzeźba z gliny\n- Środa: collage i mixed media\n- Czwartek: animacja poklatkowa\n- Piątek: wernisaż prac!\n\nZajęcia 9:00-14:00. Drugie śniadanie zapewnione.",
    image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=500&fit=crop",
    date_start: futureDate(20), date_end: futureDate(25),
    camp_type: "polkolonie", season: "lato", duration_days: 5,
    meals_included: true, transport_included: false,
    age_min: 5, age_max: 10, price: 650, is_free: false,
    district: "Kazimierz", venue_name: "Pracownia ArtKids", venue_address: "ul. Józefa 24, Kraków",
    organizer: "ArtKids Kraków", source_url: null, facebook_url: null,
    is_featured: true, status: "published", likes: 35, dislikes: 0,
    created_at: "2024-02-05T10:00:00Z", updated_at: "2024-02-05T10:00:00Z",
  },
  {
    id: "c3", content_type: "camp",
    title: "Półkolonie Naukowe — Laboratorium Przyszłości",
    slug: "polkolonie-naukowe-laboratorium-przyszlosci",
    description_short: "Eksperymenty, robotyka, programowanie i fizyka przez zabawę. Tydzień pełen nauki!",
    description_long: "Laboratorium Przyszłości to półkolonie dla ciekawskich dzieci, które kochają naukę.\n\n- Budowanie robotów z LEGO Mindstorms\n- Podstawy programowania (Scratch)\n- Eksperymenty chemiczne\n- Fizyka w kuchni\n- Wirtualna rzeczywistość\n\nZajęcia 8:30-15:00. Obiad i przekąski w cenie.",
    image_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=500&fit=crop",
    date_start: futureDate(14), date_end: futureDate(19),
    camp_type: "polkolonie", season: "lato", duration_days: 5,
    meals_included: true, transport_included: false,
    age_min: 7, age_max: 12, price: 750, is_free: false,
    district: "Krowodrza", venue_name: "Centrum Nauki FunLab", venue_address: "ul. Lea 12, Kraków",
    organizer: "FunLab Edukacja", source_url: null, facebook_url: null,
    is_featured: false, status: "published", likes: 28, dislikes: 2,
    created_at: "2024-02-03T10:00:00Z", updated_at: "2024-02-03T10:00:00Z",
  },
  {
    id: "c4", content_type: "camp",
    title: "Obóz Piłkarski — Akademia Młodych Orłów",
    slug: "oboz-pilkarski-akademia-mlodych-orlow",
    description_short: "Tydzień intensywnych treningów piłkarskich pod okiem licencjonowanych trenerów.",
    description_long: "Akademia Młodych Orłów zaprasza na letni obóz piłkarski!\n\n- Treningi 2x dziennie\n- Turniej na zakończenie\n- Analiza wideo\n- Zajęcia z koordynacji\n- Gry i zabawy integracyjne\n\nKażdy uczestnik otrzyma koszulkę i piłkę. Zajęcia 9:00-16:00.",
    image_url: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=500&fit=crop",
    date_start: futureDate(25), date_end: futureDate(30),
    camp_type: "polkolonie", season: "lato", duration_days: 5,
    meals_included: true, transport_included: false,
    age_min: 6, age_max: 13, price: 800, is_free: false,
    district: "Nowa Huta", venue_name: "Stadion Hutnika", venue_address: "ul. Ptaszyckiego 4, Kraków",
    organizer: "Akademia Młodych Orłów", source_url: null, facebook_url: null,
    is_featured: false, status: "published", likes: 19, dislikes: 0,
    created_at: "2024-02-04T10:00:00Z", updated_at: "2024-02-04T10:00:00Z",
  },
  {
    id: "c5", content_type: "camp",
    title: "Warsztaty Wakacyjne — Teatr i Drama",
    slug: "warsztaty-wakacyjne-teatr-i-drama",
    description_short: "3-dniowe warsztaty teatralne z pokazem dla rodziców na zakończenie!",
    description_long: "Warsztaty Teatr i Drama to 3 dni pełne ekspresji i zabawy.\n\n- Improwizacja i gry dramatyczne\n- Praca z ciałem i głosem\n- Tworzenie własnych scenek\n- Pokaz dla rodziców w piątek o 15:00\n\nZajęcia prowadzi aktorka Teatru STU. Godziny: 10:00-14:00.",
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=500&fit=crop",
    date_start: futureDate(18), date_end: futureDate(21),
    camp_type: "warsztaty_wakacyjne", season: "lato", duration_days: 3,
    meals_included: false, transport_included: false,
    age_min: 8, age_max: 14, price: 350, is_free: false,
    district: "Stare Miasto", venue_name: "Centrum Kultury Rotunda", venue_address: "ul. Oleandry 1, Kraków",
    organizer: "Teatr Młodych", source_url: null, facebook_url: null,
    is_featured: false, status: "published", likes: 14, dislikes: 0,
    created_at: "2024-02-06T10:00:00Z", updated_at: "2024-02-06T10:00:00Z",
  },
  {
    id: "c6", content_type: "camp",
    title: "Ferie Zimowe — Tydzień z Nauką i Zabawą",
    slug: "ferie-zimowe-tydzien-z-nauka-i-zabawa",
    description_short: "Półkolonie feryjne: eksperymenty, gry planszowe, warsztaty kulinarne i wycieczki.",
    description_long: "Nie wiesz co robić z dzieckiem w ferie? Mamy rozwiązanie!\n\n- Poniedziałek: eksperymenty naukowe\n- Wtorek: warsztaty kulinarne\n- Środa: wycieczka do muzeum\n- Czwartek: gry planszowe i escape room\n- Piątek: olimpiada sportowa\n\nZajęcia 8:00-16:00. Pełne wyżywienie.",
    image_url: "https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=800&h=500&fit=crop",
    date_start: futureDate(60), date_end: futureDate(65),
    camp_type: "polkolonie", season: "ferie_zimowe", duration_days: 5,
    meals_included: true, transport_included: false,
    age_min: 6, age_max: 11, price: 600, is_free: false,
    district: "Stare Miasto", venue_name: "Dom Kultury Pod Lipami", venue_address: "ul. Krupnicza 8, Kraków",
    organizer: "EduFun Kraków", source_url: null, facebook_url: null,
    is_featured: false, status: "published", likes: 8, dislikes: 0,
    created_at: "2024-02-07T10:00:00Z", updated_at: "2024-02-07T10:00:00Z",
  },
];

// ============================================
// Places (8 items)
// ============================================

export const mockPlaces: Place[] = [
  {
    id: "p1", content_type: "place",
    title: "Plac Zabaw w Parku Jordana",
    slug: "plac-zabaw-park-jordana",
    description_short: "Jeden z najlepszych placów zabaw w Krakowie. Duży, ogrodzony, z nawierzchnią bezpieczną.",
    description_long: "Plac zabaw w Parku Jordana to legendarny punkt na mapie krakowskich rodziców.\n\n- Strefa dla maluchów (0-3 lata)\n- Strefa dla starszych dzieci (3-12 lat)\n- Zjezdżalnie, huśtawki, karuzele\n- Piłkarzyki i ping-pong\n- Ławki i cienie dla rodziców\n\nOtwarty całodobowo. Nawierzchnia bezpieczna (guma).",
    image_url: "https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=800&h=500&fit=crop",
    place_type: "Ruch i aktywność fizyczna", is_indoor: false,
    street: "al. 3 Maja, 30-062", city: "Kraków", district: "Krowodrza",
    lat: 50.0590, lng: 19.9200,
    age_min: 0, age_max: 12, price: null, is_free: true,
    amenities: ["ogrodzony", "nawierzchnia bezpieczna", "ławki", "cień", "toalety w pobliżu"],
    opening_hours: "Całodobowo",
    source_url: null, facebook_url: null, is_featured: true, status: "published", likes: 89, dislikes: 3,
    created_at: "2024-03-01T10:00:00Z", updated_at: "2024-03-01T10:00:00Z",
  },
  {
    id: "p2", content_type: "place",
    title: "Hulakula — Centrum Zabaw",
    slug: "hulakula-centrum-zabaw",
    description_short: "Ogromna sala zabaw z labiryntem, trampolinami i strefą dla najmłodszych.",
    description_long: "Hulakula to jedno z największych centrów zabaw w Krakowie.\n\n- Wielopoziomowy labirynt z przeszkodami\n- Strefa trampolin\n- Baseny z piłeczkami\n- Strefa sensoryczna (0-3 lata)\n- Kawiarnia z widokiem na salę\n\nSz Szatnia i parking gratis. Możliwość organizacji urodzin.",
    image_url: "https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=800&h=500&fit=crop",
    place_type: "Szybka rozrywka / atrakcje", is_indoor: true,
    street: "ul. Dobrego Pasterza 120, 31-416", city: "Kraków", district: "Prądnik Czerwony",
    lat: 50.0870, lng: 19.9780,
    age_min: 1, age_max: 12, price: 35, is_free: false,
    amenities: ["parking", "szatnia", "kawiarnia", "Wi-Fi", "urodziny"],
    opening_hours: "Pn-Pt 10:00-20:00, So-Nd 9:00-21:00",
    source_url: null, facebook_url: null, is_featured: true, status: "published", likes: 64, dislikes: 5,
    created_at: "2024-03-02T10:00:00Z", updated_at: "2024-03-02T10:00:00Z",
  },
  {
    id: "p3", content_type: "place",
    title: "Plac Zabaw na Bulwarach Wiślanych",
    slug: "plac-zabaw-bulwary-wislane",
    description_short: "Nowoczesny plac zabaw nad Wisłą z elementami wodnymi (latem) i widokiem na Wawel.",
    description_long: "Plac zabaw na Bulwarach to jedno z najpiękniej położonych miejsc do zabawy w Krakowie.\n\n- Drewniane konstrukcje do wspinania\n- Huśtawki i zjezdżalnie\n- Elementy wodne (kurtyny wodne latem)\n- Widok na Wawel\n\nŚwietne połączenie z rowerową trasą wzdłuż Wisły.",
    image_url: "https://images.unsplash.com/photo-1596997000103-e597b3ca50df?w=800&h=500&fit=crop",
    place_type: "Ruch i aktywność fizyczna", is_indoor: false,
    street: "Bulwary Wiślane", city: "Kraków", district: "Stare Miasto",
    lat: 50.0490, lng: 19.9380,
    age_min: 2, age_max: 10, price: null, is_free: true,
    amenities: ["elementy wodne", "ławki", "trasa rowerowa", "widok na Wawel"],
    opening_hours: "Całodobowo",
    source_url: null, facebook_url: null, is_featured: false, status: "published", likes: 55, dislikes: 2,
    created_at: "2024-03-03T10:00:00Z", updated_at: "2024-03-03T10:00:00Z",
  },
  {
    id: "p4", content_type: "place",
    title: "FikoLand — Sala Zabaw i Trampolin",
    slug: "fikoland-sala-zabaw-i-trampolin",
    description_short: "Park trampolin i sala zabaw w jednym. Atrakcje dla dzieci i dorosłych!",
    description_long: "FikoLand to nowoczesny park rozrywki wewnątrz centrum handlowego.\n\n- 20 trampolin (w tym dodge ball)\n- Ściana wspinaczkowa\n- Tor ninja\n- Sala zabaw dla maluchów\n- Strefa relaksu dla rodziców\n\nObowiązkowe skarpetki antypoślizgowe (do kupienia na miejscu).",
    image_url: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&h=500&fit=crop",
    place_type: "Szybka rozrywka / atrakcje", is_indoor: true,
    street: "ul. Zakopiańska 62, 30-418", city: "Kraków", district: "Podgórze",
    lat: 50.0180, lng: 19.9370,
    age_min: 3, age_max: 15, price: 40, is_free: false,
    amenities: ["parking", "szatnia", "kawiarnia", "urodziny", "sklepik"],
    opening_hours: "Codziennie 10:00-21:00",
    source_url: null, facebook_url: null, is_featured: false, status: "published", likes: 41, dislikes: 3,
    created_at: "2024-03-04T10:00:00Z", updated_at: "2024-03-04T10:00:00Z",
  },
  {
    id: "p5", content_type: "place",
    title: "Cafe Bunkier z Kącikiem Dzieciecym",
    slug: "cafe-bunkier-z-kacikiem-dzieciecym",
    description_short: "Stylowa kawiarnia ze świetnym kącikiem zabaw. Kawa dla rodziców, zabawa dla dzieci.",
    description_long: "Cafe Bunkier to ulubione miejsce krakowskich rodziców na kawę.\n\n- Kącik zabaw z drewnianymi zabawkami\n- Książeczki i kolorowanki\n- Krzesła do karmienia\n- Przewijak\n- Dobra kawa i domowe ciasta\n\nSpokojna atmosfera, idealna na spotkania z innymi rodzicami.",
    image_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=500&fit=crop",
    place_type: "Relaks i natura", is_indoor: true,
    street: "pl. Szczepański 3a, 31-011", city: "Kraków", district: "Stare Miasto",
    lat: 50.0640, lng: 19.9330,
    age_min: 0, age_max: 6, price: null, is_free: true,
    amenities: ["kącik zabaw", "przewijak", "krzesła do karmienia", "Wi-Fi"],
    opening_hours: "Pn-So 9:00-20:00, Nd 10:00-18:00",
    source_url: null, facebook_url: null, is_featured: false, status: "published", likes: 37, dislikes: 1,
    created_at: "2024-03-05T10:00:00Z", updated_at: "2024-03-05T10:00:00Z",
  },
  {
    id: "p6", content_type: "place",
    title: "Plac Zabaw w Parku Bednarskiego",
    slug: "plac-zabaw-park-bednarskiego",
    description_short: "Urokliwy plac zabaw z widokiem na miasto. Spokojny, zielony, idealny na weekendowe popołudnie.",
    description_long: "Plac zabaw w Parku Bednarskiego to ukryty skarb Podgórza.\n\n- Drewniane urządzenia zabawowe\n- Huśtawki i piaskownica\n- Dużo zieleni i cienia\n- Spokojny, mniej zatłoczony\n- Piękny widok na Stare Miasto\n\nPark świetny również na spacery z wózkiem.",
    image_url: "https://images.unsplash.com/photo-1564429238961-bf8dc9738580?w=800&h=500&fit=crop",
    place_type: "Ruch i aktywność fizyczna", is_indoor: false,
    street: "Park Bednarskiego, 30-534", city: "Kraków", district: "Podgórze",
    lat: 50.0430, lng: 19.9490,
    age_min: 1, age_max: 10, price: null, is_free: true,
    amenities: ["zieleń", "widok", "ławki", "cień"],
    opening_hours: "Całodobowo",
    source_url: null, facebook_url: null, is_featured: false, status: "published", likes: 31, dislikes: 0,
    created_at: "2024-03-06T10:00:00Z", updated_at: "2024-03-06T10:00:00Z",
  },
  {
    id: "p7", content_type: "place",
    title: "Bajkowa Kraina — Sala Zabaw dla Maluchów",
    slug: "bajkowa-kraina-sala-zabaw-dla-maluchow",
    description_short: "Kameralna sala zabaw stworzona specjalnie dla dzieci 0-5 lat. Cicho, czysto, bezpiecznie.",
    description_long: "Bajkowa Kraina to miejsce stworzone z myślą o najmłodszych.\n\n- Strefa sensoryczna (0-1 rok)\n- Zabawki drewniane i Montessori\n- Miękki plac zabaw\n- Książeczki i kącik plastyczny\n- Ciche, kameralne (max 15 dzieci)\n\nKawiarnia z widokiem na salę. Bezpłatne skarpetki dla dzieci.",
    image_url: "https://images.unsplash.com/photo-1587654780292-39c9b7340adc?w=800&h=500&fit=crop",
    place_type: "Szybka rozrywka / atrakcje", is_indoor: true,
    street: "ul. Długa 35, 31-146", city: "Kraków", district: "Stare Miasto",
    lat: 50.0670, lng: 19.9380,
    age_min: 0, age_max: 5, price: 25, is_free: false,
    amenities: ["kawiarnia", "przewijak", "Montessori", "kameralna"],
    opening_hours: "Pn-So 9:00-18:00",
    source_url: null, facebook_url: null, is_featured: false, status: "published", likes: 26, dislikes: 0,
    created_at: "2024-03-07T10:00:00Z", updated_at: "2024-03-07T10:00:00Z",
  },
  {
    id: "p8", content_type: "place",
    title: "Mega Fun Park — Centrum Rozrywki",
    slug: "mega-fun-park-centrum-rozrywki",
    description_short: "Największe centrum rozrywki dla dzieci w Krakowie. Labirynty, zjezdżalnie i strefa VR.",
    description_long: "Mega Fun Park to ponad 2000 m² zabawy!\n\n- Wielopoziomowy labirynt\n- Mega zjezdżalnia (12 metrów)\n- Strefa VR (od 8 lat)\n- Strefa maluchów (do 3 lat)\n- Tor go-kartów (od 6 lat)\n\nBilet całodniowy — wchodzisz i wychodzisz kiedy chcesz.",
    image_url: "https://images.unsplash.com/photo-1472457897821-70d225057ae5?w=800&h=500&fit=crop",
    place_type: "Szybka rozrywka / atrakcje", is_indoor: true,
    street: "ul. Wielicka 263, 30-663", city: "Kraków", district: "Podgórze",
    lat: 50.0240, lng: 19.9600,
    age_min: 1, age_max: 14, price: 45, is_free: false,
    amenities: ["parking", "szatnia", "kawiarnia", "urodziny", "VR", "Wi-Fi"],
    opening_hours: "Codziennie 10:00-21:00",
    source_url: null, facebook_url: null, is_featured: true, status: "published", likes: 52, dislikes: 6,
    created_at: "2024-03-08T10:00:00Z", updated_at: "2024-03-08T10:00:00Z",
  },
];

// ============================================
// Combined discovery feed
// ============================================

export function getDiscoveryFeed(): DiscoveryItem[] {
  return [...mockEvents, ...mockCamps, ...mockPlaces]
    .filter((item) => item.status === "published")
    .sort((a, b) => b.likes - a.likes);
}

// ============================================
// Labels & Icons
// ============================================

// Content type labels
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  event: "Wydarzenie",
  camp: "Kolonie",
  place: "Miejsce",
};

export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  event: "��",
  camp: "⛺",
  place: "��",
};

export const CONTENT_TYPE_COLORS: Record<ContentType, { bg: string; text: string; border: string }> = {
  event: { bg: "bg-[#FFF5F2]", text: "text-[#E8573A]", border: "border-[#FFE8E0]" },
  camp: { bg: "bg-blue-50", text: "text-[#2E7DBA]", border: "border-blue-200" },
  place: { bg: "bg-[#F2F7F2]", text: "text-[#4A7C59]", border: "border-[#DCE8DC]" },
};

// Event categories
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  warsztaty: "Warsztaty", spektakl: "Spektakle", muzyka: "Muzyka", sport: "Sport",
  natura: "Natura", edukacja: "Edukacja", festyn: "Festyny", kino: "Kino",
  wystawa: "Wystawy", inne: "Inne",
};

export const CATEGORY_ICONS: Record<EventCategory, string> = {
  warsztaty: "✂️", spektakl: "🎭", muzyka: "🎵", sport: "⚽",
  natura: "🌿", edukacja: "📚", festyn: "🎉", kino: "🎬",
  wystawa: "🖼️", inne: "✨",
};

// Camp type labels
export const CAMP_TYPE_LABELS: Record<CampType, string> = {
  kolonie: "Kolonie", polkolonie: "Półkolonie", warsztaty_wakacyjne: "Warsztaty wakacyjne",
};

export const CAMP_TYPE_ICONS: Record<CampType, string> = {
  kolonie: "��️", polkolonie: "☀️", warsztaty_wakacyjne: "��",
};

export const CAMP_SEASON_LABELS: Record<CampSeason, string> = {
  lato: "Lato", zima: "Zima", ferie_zimowe: "Ferie zimowe", ferie_wiosenne: "Ferie wiosenne", caly_rok: "Cały rok",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  sportowe: "Sportowe",
  artystyczne: "Artystyczne",
  edukacyjne: "Edukacyjne",
  muzyczne: "Muzyczne",
  taneczne: "Taneczne",
  jezykowe: "Językowe",
  sensoryczne: "Sensoryczne",
  inne: "Inne",
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  sportowe: "⚽",
  artystyczne: "🎨",
  edukacyjne: "📚",
  muzyczne: "🎵",
  taneczne: "💃",
  jezykowe: "🗣️",
  sensoryczne: "🧩",
  inne: "✨",
};

// Place type labels
export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  "Relaks i natura": "Relaks",
  "Nauka przez zabawę": "Nauka",
  "Szybka rozrywka / atrakcje": "Rozrywka",
  "Ruch i aktywność fizyczna": "Ruch",
  "Oglądanie / kultura": "Kultura",
  "Kreatywność i warsztaty": "Kreatywność",
  "Sala zabaw": "Sala zabaw",
  "Plac zabaw": "Plac zabaw",
  "inne": "Inne",
};

export const PLACE_TYPE_ICONS: Record<PlaceType, string> = {
  "Relaks i natura": "🌿",
  "Nauka przez zabawę": "🔬",
  "Szybka rozrywka / atrakcje": "🎢",
  "Ruch i aktywność fizyczna": "⚽",
  "Oglądanie / kultura": "🎭",
  "Kreatywność i warsztaty": "🎨",
  "Sala zabaw": "🧸",
  "Plac zabaw": "🛝",
  "inne": "📍",
};

// Shared constants
export const DISTRICT_LIST = [
  "Stare Miasto", "Kazimierz", "Podgórze", "Nowa Huta", "Krowodrza",
  "Bronowice", "Zwierzyniec", "Dębniki", "Prądnik Czerwony",
  "Prądnik Biały", "Czyżyny", "Bieżanów", "Inne",
] as const;

export const AGE_GROUPS = [
  { label: "Niemowlęta (0-2)", min: 0, max: 2, value: "0-2" },
  { label: "Maluchy (3-5)", min: 3, max: 5, value: "3-5" },
  { label: "Dzieci (6-9)", min: 6, max: 9, value: "6-9" },
  { label: "Starsze (10+)", min: 10, max: 99, value: "10+" },
] as const;
