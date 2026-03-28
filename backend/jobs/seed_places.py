"""
Seed places table with initial data + geocoding.
Run via: python -m backend.jobs.seed_places
"""

from __future__ import annotations

import logging
import re
import sys
import time

import requests

from backend import db as database
from backend.jobs.logging_setup import setup_logging

setup_logging("seed_places")
logger = logging.getLogger(__name__)

PLACES = [
    {"title": "Kraków Zoo", "place_type": "zwierzeta", "experience_type": "Relaks i natura", "description_short": "Duży ogród zoologiczny w Lesie Wolskim, gdzie dzieci mogą zobaczyć setki gatunków zwierząt z całego świata. Są tu ścieżki spacerowe, mini zoo i punkty edukacyjne.", "address": "al. Kasy Oszczędności 14", "source_url": "https://zoo-krakow.pl", "is_indoor": False},
    {"title": "WOMAI Centrum Nauki i Zmysłów", "place_type": "edukacja", "experience_type": "Nauka przez zabawę", "description_short": "Nowoczesne centrum nauki z interaktywnymi wystawami i doświadczeniami sensorycznymi, w tym zwiedzanie w całkowitej ciemności.", "address": "ul. Pawia 34", "source_url": "https://womai.pl", "is_indoor": True},
    {"title": "House of Attractions", "place_type": "rozrywka", "experience_type": "Szybka rozrywka / atrakcje", "description_short": "Kompleks atrakcji w centrum – labirynty, VR, iluzje i inne szybkie aktywności dla dzieci i rodzin.", "address": "ul. Grodzka 2", "source_url": "https://houseofattractions.club", "is_indoor": True},
    {"title": "TomorrowLand Kraków", "place_type": "rozrywka", "experience_type": "Szybka rozrywka / atrakcje", "description_short": "Multimedialna przestrzeń rozrywki z różnymi strefami zabawy, idealna na krótszą wizytę w centrum miasta.", "address": "ul. Floriańska 5", "source_url": "https://tomorrowlandkrakow.pl", "is_indoor": True},
    {"title": "Lustrzany Labirynt", "place_type": "rozrywka", "experience_type": "Szybka rozrywka / atrakcje", "description_short": "Zabawa wśród luster i iluzji optycznych – dzieci uwielbiają szukanie wyjścia i efekt nieskończoności.", "address": "ul. Grodzka 14", "source_url": "https://mirrorlabyrinth.pl", "is_indoor": True},
    {"title": "Bricks & Figs (Muzeum LEGO)", "place_type": "muzeum", "experience_type": "Nauka przez zabawę", "description_short": "Wystawy modeli z klocków LEGO – od budowli po postacie. Dla młodszych i starszych fanów klocków.", "address": "ul. Dąbrowskiego 20", "source_url": "https://bricksandfigs.pl", "is_indoor": True},
    {"title": "Park Wodny Kraków", "place_type": "basen", "experience_type": "Ruch i aktywność fizyczna", "description_short": "Jeden z największych aquaparków w Polsce – zjeżdżalnie, baseny, strefy dla dzieci i relaks dla rodziców.", "address": "ul. Dobrego Pasterza 126", "source_url": "https://parkwodny.pl", "is_indoor": True},
    {"title": "GOjump MEGApark", "place_type": "sport", "experience_type": "Ruch i aktywność fizyczna", "description_short": "Duży park trampolin z torami przeszkód i strefami skakania, świetny dla dzieci z dużą energią.", "address": "ul. Centralna 41A", "source_url": "https://gojump.pl", "is_indoor": True},
    {"title": "Ogród Doświadczeń im. Lema", "place_type": "nauka", "experience_type": "Nauka przez zabawę", "description_short": "Park edukacyjny na świeżym powietrzu – eksperymenty fizyczne, instalacje i zabawa poprzez naukę.", "address": "al. Pokoju 68", "source_url": "https://ogroddoswiadczen.pl", "is_indoor": False},
    {"title": "Muzeum Inżynierii i Techniki", "place_type": "edukacja", "experience_type": "Nauka przez zabawę", "description_short": "Interaktywne wystawy techniczne, pojazdy i eksperymenty – dzieci mogą dotykać i testować.", "address": "ul. św. Wawrzyńca 15", "source_url": "https://mit.krakow.pl", "is_indoor": True},
    {"title": "Muzeum Lotnictwa Polskiego", "place_type": "muzeum", "experience_type": "Oglądanie / kultura", "description_short": "Ogromna kolekcja samolotów i eksponatów – dużo przestrzeni do zwiedzania i pikniku.", "address": "al. Jana Pawła II 39", "source_url": "https://muzeumlotnictwa.pl", "is_indoor": False},
    {"title": "Żywe Muzeum Obwarzanka", "place_type": "warsztaty", "experience_type": "Kreatywność i warsztaty", "description_short": "Warsztaty robienia obwarzanków – dzieci uczą się przez zabawę i mogą zjeść swoje wypieki.", "address": "ul. Paderewskiego 4", "source_url": "https://muzeumobwarzanka.com", "is_indoor": True},
    {"title": "HistoryLand", "place_type": "edukacja", "experience_type": "Nauka przez zabawę", "description_short": "Historia Polski przedstawiona z klocków LEGO – bardzo atrakcyjna forma nauki dla dzieci.", "address": "pl. Jana Nowaka-Jeziorańskiego", "source_url": "https://historyland.pl", "is_indoor": True},
    {"title": "Podziemia Rynku", "place_type": "historia", "experience_type": "Oglądanie / kultura", "description_short": "Multimedialna wystawa pod Rynkiem – historia miasta pokazana w atrakcyjny sposób.", "address": "Rynek Główny 1", "source_url": "https://muzeumkrakowa.pl", "is_indoor": True},
    {"title": "Zamek Wawelski + Smocza Jama", "place_type": "zwiedzanie", "experience_type": "Oglądanie / kultura", "description_short": "Zwiedzanie zamku i wejście do jaskini smoka wawelskiego – klasyczna atrakcja dla dzieci.", "address": "Wawel 5", "source_url": "https://wawel.krakow.pl", "is_indoor": False},
    {"title": "Kopiec Kościuszki", "place_type": "widoki", "experience_type": "Relaks i natura", "description_short": "Łatwe wejście i świetny widok na miasto, dodatkowo małe muzeum i przestrzeń do biegania.", "address": "al. Waszyngtona 1", "source_url": "https://kopieckosciuszki.pl", "is_indoor": False},
    {"title": "Ogród Botaniczny UJ", "place_type": "natura", "experience_type": "Relaks i natura", "description_short": "Spokojne miejsce pełne roślin, szklarni i ścieżek – dobre na relaksujący spacer z dziećmi.", "address": "ul. Kopernika 27", "source_url": "https://ogrod.uj.edu.pl", "is_indoor": False},
    {"title": "Bulwary Wiślane", "place_type": "spacer", "experience_type": "Relaks i natura", "description_short": "Długie ścieżki spacerowe i rowerowe nad rzeką – idealne na luźny rodzinny dzień.", "address": "Bulwary Wiślane", "source_url": "https://krakow.pl", "is_indoor": False, "is_free": True},
    {"title": "Park Jordana", "place_type": "park", "experience_type": "Relaks i natura", "description_short": "Duży park z wieloma atrakcjami sportowymi i przestrzenią do zabawy oraz odpoczynku.", "address": "al. 3 Maja", "source_url": "https://zzm.krakow.pl", "is_indoor": False, "is_free": True},
    {"title": "Las Wolski", "place_type": "natura", "experience_type": "Relaks i natura", "description_short": "Naturalny las na obrzeżach miasta – idealny na wycieczki, spacery i kontakt z naturą.", "address": "Las Wolski", "source_url": "https://krakow.travel", "is_indoor": False, "is_free": True},
    {"title": "Kopiec Piłsudskiego", "place_type": "widoki", "experience_type": "Relaks i natura", "description_short": "Największy kopiec w Krakowie, położony w lesie – dobra opcja na aktywny spacer.", "address": "Las Wolski, Kopiec Piłsudskiego", "source_url": "https://kopiec-pilsudskiego.pl", "is_indoor": False, "is_free": True},
    {"title": "Teatr Groteska", "place_type": "kultura", "experience_type": "Oglądanie / kultura", "description_short": "Teatr specjalizujący się w spektaklach dla dzieci – kolorowe, ciekawe przedstawienia.", "address": "ul. Skarbowa 2", "source_url": "https://groteska.pl", "is_indoor": True},
    {"title": "Teatr Ludowy", "place_type": "kultura", "experience_type": "Oglądanie / kultura", "description_short": "Spektakle dla rodzin i dzieci, często interaktywne i dostosowane do młodszej widowni.", "address": "os. Teatralne 34", "source_url": "https://ludowy.pl", "is_indoor": True},
    {"title": "Pixel XL Kraków", "place_type": "rozrywka", "experience_type": "Szybka rozrywka / atrakcje", "description_short": "Interaktywna podłoga i gry ruchowe – dzieci mogą skakać i rywalizować.", "address": "ul. Starowiślna", "source_url": "https://pixel-xl.pl", "is_indoor": True},
    {"title": "Pigcasso", "place_type": "kreatywne", "experience_type": "Kreatywność i warsztaty", "description_short": "Studio malowania i kreatywnych warsztatów – dzieci tworzą własne obrazy.", "address": "Kraków", "source_url": "https://pigcasso.art", "is_indoor": True},
    {"title": "Klockoland", "place_type": "edukacja", "experience_type": "Nauka przez zabawę", "description_short": "Strefa zabawy i edukacji z klockami – rozwijanie kreatywności i logicznego myślenia.", "address": "Kraków", "source_url": "https://klockoland.pl", "is_indoor": True},
    {"title": "AleKlocki", "place_type": "sala_zabaw", "experience_type": "Kreatywność i warsztaty", "description_short": "Przestrzeń do zabawy klockami LEGO i organizacji warsztatów tematycznych.", "address": "ul. Jasnogórska", "source_url": "https://aleklocki.pl", "is_indoor": True},
    {"title": "Park Linowy Kraków", "place_type": "sport", "experience_type": "Ruch i aktywność fizyczna", "description_short": "Trasy linowe o różnym poziomie trudności – aktywność na świeżym powietrzu.", "address": "Kraków", "source_url": "https://parklinowy.pl", "is_indoor": False},
    {"title": "Wioski Świata Park Edukacyjny", "place_type": "edukacja", "experience_type": "Nauka przez zabawę", "description_short": "Poznawanie kultur świata poprzez rekonstrukcje domów i warsztaty edukacyjne.", "address": "Kraków", "source_url": "https://wioskiswiata.org", "is_indoor": False},
    {"title": "Muzeum Witrażu", "place_type": "sztuka", "experience_type": "Kreatywność i warsztaty", "description_short": "Możliwość zobaczenia jak powstają witraże i udziału w warsztatach.", "address": "al. Krasińskiego 23", "source_url": "https://muzeumwitrazu.pl", "is_indoor": True},
    {"title": "Muzeum Czekolady", "place_type": "warsztaty", "experience_type": "Kreatywność i warsztaty", "description_short": "Warsztaty tworzenia czekolady – idealne dla dzieci lubiących słodkości.", "address": "Kraków", "source_url": "https://chocolatemuseum.pl", "is_indoor": True},
    {"title": "Pałac Krzysztofory", "place_type": "muzeum", "experience_type": "Oglądanie / kultura", "description_short": "Oddział Muzeum Krakowa z wystawami często dostosowanymi do rodzin.", "address": "Rynek Główny 35", "source_url": "https://muzeumkrakowa.pl", "is_indoor": True},
    {"title": "Smart Kids Planet", "place_type": "edukacja", "experience_type": "Nauka przez zabawę", "description_short": "Wydarzenia i instalacje edukacyjne dla dzieci (często sezonowe).", "address": "Kraków", "source_url": "https://smartkidsplanet.pl", "is_indoor": True},
    {"title": "Klub Rodziców Bronowice", "place_type": "warsztaty", "experience_type": "Kreatywność i warsztaty", "description_short": "Spotkania, zajęcia i warsztaty dla dzieci i rodziców – bardziej lokalna inicjatywa.", "address": "ul. Wizjonerów", "source_url": "https://krakow.pl", "is_indoor": True},
    {"title": "Bawialnia Kropka", "place_type": "sala_zabaw", "experience_type": "Szybka rozrywka / atrakcje", "description_short": "Indoor sala zabaw dla młodszych dzieci – dobra na niepogodę.", "address": "ul. Wrocławska 53", "source_url": "https://bawialniakropka.pl", "is_indoor": True},
    {"title": "Maskotkolandia", "place_type": "sala_zabaw", "experience_type": "Szybka rozrywka / atrakcje", "description_short": "Tematyczna przestrzeń zabawy dla dzieci, dużo atrakcji ruchowych.", "address": "Kraków", "source_url": "https://maskotkolandia.pl", "is_indoor": True},
    {"title": "Smocza Jama", "place_type": "atrakcja", "experience_type": "Oglądanie / kultura", "description_short": "Jaskinia pod Wawelem związana z legendą smoka – krótkie, ale klimatyczne doświadczenie.", "address": "Wawel", "source_url": "https://wawel.krakow.pl", "is_indoor": True},
]


def make_slug(title: str) -> str:
    s = title.lower()
    s = s.replace("ą", "a").replace("ć", "c").replace("ę", "e").replace("ł", "l")
    s = s.replace("ń", "n").replace("ó", "o").replace("ś", "s").replace("ź", "z").replace("ż", "z")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def geocode(address: str) -> tuple[float, float] | None:
    query = address if "kraków" in address.lower() else f"{address}, Kraków"
    try:
        time.sleep(1.1)
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": "1", "countrycodes": "pl"},
            headers={"User-Agent": "rodzic-w-tarapatach/1.0"},
            timeout=10,
        )
        data = resp.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        logger.warning("Geocode failed for '%s': %s", address, e)
    return None


def main() -> None:
    db = database.get_client()

    for place in PLACES:
        slug = make_slug(place["title"])
        logger.info("Processing: %s", place["title"])

        # Check if already exists
        existing = db.table("places").select("id").eq("slug", slug).execute()
        if existing.data:
            logger.info("  Already exists, skipping")
            continue

        # Geocode
        coords = geocode(place["address"])
        lat, lng = coords if coords else (None, None)
        if coords:
            logger.info("  Geocoded: %s -> (%s, %s)", place["address"], lat, lng)
        else:
            logger.warning("  Could not geocode: %s", place["address"])

        row = {
            "title": place["title"],
            "slug": slug,
            "description_short": place["description_short"],
            "place_type": place["place_type"],
            "is_indoor": place.get("is_indoor", False),
            "address": place["address"],
            "district": "Inne",
            "lat": lat,
            "lng": lng,
            "source_url": place.get("source_url"),
            "is_free": place.get("is_free", False),
            "status": "published",
        }

        db.table("places").insert(row).execute()
        logger.info("  Inserted: %s", place["title"])

    logger.info("Done! Seeded %d places", len(PLACES))


if __name__ == "__main__":
    main()
