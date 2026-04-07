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
    {"title": "Kraków Zoo", "place_type": "Relaks i natura", "district": "Zwierzyniec", "lat": 50.0563, "lng": 19.8250,
     "description_short": "Duży ogród zoologiczny w Lesie Wolskim.",
     "description_long": "Krakowskie zoo położone w Lesie Wolskim oferuje setki gatunków zwierząt oraz przestrzeń do spacerów i edukacji przyrodniczej.",
     "address": "al. Kasy Oszczędności 14", "source_url": "https://zoo-krakow.pl", "is_indoor": False},

    {"title": "WOMAI Centrum Nauki i Zmysłów", "place_type": "Nauka przez zabawę", "district": "Stare Miasto", "lat": 50.0675, "lng": 19.9450,
     "description_short": "Interaktywne centrum nauki.",
     "description_long": "Nowoczesne centrum nauki z doświadczeniami sensorycznymi, w tym zwiedzanie w całkowitej ciemności.",
     "address": "ul. Pawia 34", "source_url": "https://womai.pl", "is_indoor": True},

    {"title": "House of Attractions", "place_type": "Szybka rozrywka / atrakcje", "district": "Stare Miasto", "lat": 50.0617, "lng": 19.9373,
     "description_short": "Labirynty, VR i iluzje.",
     "description_long": "Zestaw atrakcji w centrum obejmujący labirynty, iluzje i VR – szybka i intensywna rozrywka.",
     "address": "ul. Grodzka 2", "source_url": "https://houseofattractions.club", "is_indoor": True},

    {"title": "TomorrowLand Kraków", "place_type": "Szybka rozrywka / atrakcje", "district": "Stare Miasto", "lat": 50.0629, "lng": 19.9383,
     "description_short": "Multimedialna przestrzeń zabawy.",
     "description_long": "Nowoczesna przestrzeń z różnymi atrakcjami multimedialnymi dla dzieci i rodzin.",
     "address": "ul. Floriańska 5", "source_url": "https://tomorrowlandkrakow.pl", "is_indoor": True},

    {"title": "Lustrzany Labirynt", "place_type": "Szybka rozrywka / atrakcje", "district": "Stare Miasto", "lat": 50.0619, "lng": 19.9380,
     "description_short": "Labirynt z luster.",
     "description_long": "Zabawa wśród luster i iluzji optycznych – dzieci próbują znaleźć wyjście.",
     "address": "ul. Grodzka 14", "source_url": "https://mirrorlabyrinth.pl", "is_indoor": True},

    {"title": "Bricks & Figs (Muzeum LEGO)", "place_type": "Nauka przez zabawę", "district": "Podgórze", "lat": 50.0415, "lng": 19.9600,
     "description_short": "Modele z LEGO.",
     "description_long": "Wystawy budowli i postaci z LEGO, rozwijające kreatywność i zainteresowanie konstrukcją.",
     "address": "ul. Dąbrowskiego 20", "source_url": "https://bricksandfigs.pl", "is_indoor": True},

    {"title": "Park Wodny Kraków", "place_type": "Ruch i aktywność fizyczna", "district": "Prądnik Czerwony", "lat": 50.0897, "lng": 19.9819,
     "description_short": "Duży aquapark.",
     "description_long": "Aquapark ze zjeżdżalniami, basenami i strefami dla dzieci – idealny na aktywny dzień.",
     "address": "ul. Dobrego Pasterza 126", "source_url": "https://parkwodny.pl", "is_indoor": True},

    {"title": "GOjump MEGApark", "place_type": "Ruch i aktywność fizyczna", "district": "Czyżyny", "lat": 50.0737, "lng": 20.0055,
     "description_short": "Park trampolin.",
     "description_long": "Duży park trampolin z torami przeszkód i strefami aktywności dla dzieci.",
     "address": "ul. Centralna 41A", "source_url": "https://gojump.pl", "is_indoor": True},

    {"title": "Ogród Doświadczeń im. Lema", "place_type": "Nauka przez zabawę", "district": "Czyżyny", "lat": 50.0686, "lng": 20.0031,
     "description_short": "Eksperymenty na świeżym powietrzu.",
     "description_long": "Park edukacyjny z instalacjami fizycznymi do nauki przez zabawę.",
     "address": "al. Pokoju 68", "source_url": "https://ogroddoswiadczen.pl", "is_indoor": False},

    {"title": "Muzeum Inżynierii i Techniki", "place_type": "Nauka przez zabawę", "district": "Kazimierz", "lat": 50.0488, "lng": 19.9445,
     "description_short": "Interaktywne muzeum techniki.",
     "description_long": "Muzeum z eksponatami technicznymi i możliwością interakcji dla dzieci.",
     "address": "ul. św. Wawrzyńca 15", "source_url": "https://mit.krakow.pl", "is_indoor": True},

    {"title": "Muzeum Lotnictwa Polskiego", "place_type": "Oglądanie / kultura", "district": "Czyżyny", "lat": 50.0725, "lng": 19.9910,
     "description_short": "Samoloty i historia lotnictwa.",
     "description_long": "Jedno z największych muzeów lotnictwa w Europie z dużą przestrzenią do zwiedzania.",
     "address": "al. Jana Pawła II 39", "source_url": "https://muzeumlotnictwa.pl", "is_indoor": False},

    {"title": "Żywe Muzeum Obwarzanka", "place_type": "Kreatywność i warsztaty", "district": "Stare Miasto", "lat": 50.0650, "lng": 19.9419,
     "description_short": "Warsztaty kulinarne.",
     "description_long": "Warsztaty tworzenia obwarzanków z elementami historii Krakowa.",
     "address": "ul. Paderewskiego 4", "source_url": "https://muzeumobwarzanka.com", "is_indoor": True},

    {"title": "HistoryLand", "place_type": "Nauka przez zabawę", "district": "Stare Miasto", "lat": 50.0670, "lng": 19.9455,
     "description_short": "Historia z LEGO.",
     "description_long": "Historia Polski przedstawiona w formie modeli LEGO.",
     "address": "Plac Jana Nowaka-Jeziorańskiego", "source_url": "https://historyland.pl", "is_indoor": True},

    {"title": "Podziemia Rynku", "place_type": "Oglądanie / kultura", "district": "Stare Miasto", "lat": 50.0616, "lng": 19.9372,
     "description_short": "Historia Krakowa pod ziemią.",
     "description_long": "Multimedialna ekspozycja pokazująca historię miasta pod Rynkiem.",
     "address": "Rynek Główny 1", "source_url": "https://muzeumkrakowa.pl", "is_indoor": True},

    {"title": "Zamek Wawelski + Smocza Jama", "place_type": "Oglądanie / kultura", "district": "Stare Miasto", "lat": 50.0540, "lng": 19.9350,
     "description_short": "Zamek i legenda smoka.",
     "description_long": "Historyczne miejsce z legendą smoka wawelskiego.",
     "address": "Wawel 5", "source_url": "https://wawel.krakow.pl", "is_indoor": False},

    {"title": "Kopiec Kościuszki", "place_type": "Relaks i natura", "district": "Zwierzyniec", "lat": 50.0547, "lng": 19.8936,
     "description_short": "Widok na miasto.",
     "description_long": "Popularny punkt widokowy i miejsce spacerów.",
     "address": "al. Waszyngtona 1", "source_url": "https://kopieckosciuszki.pl", "is_indoor": False},

    {"title": "Ogród Botaniczny UJ", "place_type": "Relaks i natura", "district": "Grzegórzki", "lat": 50.0637, "lng": 19.9603,
     "description_short": "Ogród roślinny.",
     "description_long": "Spokojna przestrzeń pełna roślin i szklarni.",
     "address": "ul. Kopernika 27", "source_url": "https://ogrod.uj.edu.pl", "is_indoor": False},

    {"title": "Bulwary Wiślane", "place_type": "Relaks i natura", "district": "Kazimierz", "lat": 50.0500, "lng": 19.9430,
     "description_short": "Spacer nad Wisłą.",
     "description_long": "Długie ścieżki spacerowe i rowerowe nad rzeką.",
     "address": "Bulwary Wiślane", "source_url": "https://krakow.pl", "is_indoor": False},

    {"title": "Park Jordana", "place_type": "Relaks i natura", "district": "Krowodrza", "lat": 50.0595, "lng": 19.9145,
     "description_short": "Duży park miejski.",
     "description_long": "Park z przestrzenią do rekreacji i odpoczynku.",
     "address": "al. 3 Maja", "source_url": "https://zzm.krakow.pl", "is_indoor": False},

    {"title": "Las Wolski", "place_type": "Relaks i natura", "district": "Zwierzyniec", "lat": 50.0560, "lng": 19.8400,
     "description_short": "Las na spacery.",
     "description_long": "Duży obszar leśny idealny na wycieczki i kontakt z naturą.",
     "address": "Las Wolski", "source_url": "https://krakow.travel", "is_indoor": False},

    {"title": "Kopiec Piłsudskiego", "place_type": "Relaks i natura", "district": "Zwierzyniec", "lat": 50.0545, "lng": 19.8510,
     "description_short": "Największy kopiec w Krakowie.",
     "description_long": "Widokowy kopiec w Lesie Wolskim, dobre miejsce na spacer.",
     "address": "Las Wolski", "source_url": "https://kopiec-pilsudskiego.pl", "is_indoor": False},

    {"title": "Teatr Groteska", "place_type": "Oglądanie / kultura", "district": "Stare Miasto", "lat": 50.0681, "lng": 19.9395,
     "description_short": "Teatr dla dzieci.",
     "description_long": "Spektakle teatralne przygotowane specjalnie dla młodszych widzów.",
     "address": "ul. Skarbowa 2", "source_url": "https://groteska.pl", "is_indoor": True},

    {"title": "Teatr Ludowy", "place_type": "Oglądanie / kultura", "district": "Nowa Huta", "lat": 50.0770, "lng": 20.0365,
     "description_short": "Teatr rodzinny.",
     "description_long": "Spektakle dla dzieci i rodzin w Nowej Hucie.",
     "address": "os. Teatralne 34", "source_url": "https://ludowy.pl", "is_indoor": True},

    {"title": "Pixel XL Kraków", "place_type": "Szybka rozrywka / atrakcje", "district": "Stare Miasto", "lat": 50.0519, "lng": 19.9445,
     "description_short": "Interaktywne gry.",
     "description_long": "Gry ruchowe na interaktywnej podłodze.",
     "address": "ul. Starowiślna", "source_url": "https://pixel-xl.pl", "is_indoor": True},

    {"title": "Pigcasso", "place_type": "Kreatywność i warsztaty", "district": "Stare Miasto", "lat": 50.0610, "lng": 19.9400,
     "description_short": "Warsztaty malarskie.",
     "description_long": "Studio kreatywne, gdzie dzieci tworzą własne obrazy.",
     "address": "Kraków", "source_url": "https://pigcasso.art", "is_indoor": True},

    {"title": "Klockoland", "place_type": "Nauka przez zabawę", "district": "Bronowice", "lat": 50.0800, "lng": 19.9000,
     "description_short": "Zabawa klockami.",
     "description_long": "Strefa edukacyjna z klockami rozwijająca kreatywność.",
     "address": "Kraków", "source_url": "https://klockoland.pl", "is_indoor": True},

    {"title": "AleKlocki", "place_type": "Kreatywność i warsztaty", "district": "Bronowice", "lat": 50.0930, "lng": 19.9005,
     "description_short": "Warsztaty LEGO.",
     "description_long": "Zabawa i warsztaty z klockami LEGO.",
     "address": "ul. Jasnogórska", "source_url": "https://aleklocki.pl", "is_indoor": True},

    {"title": "Park Linowy Kraków", "place_type": "Ruch i aktywność fizyczna", "district": "Zwierzyniec", "lat": 50.0565, "lng": 19.8300,
     "description_short": "Trasy linowe.",
     "description_long": "Aktywność na świeżym powietrzu z przeszkodami.",
     "address": "Kraków", "source_url": "https://parklinowy.pl", "is_indoor": False},

    {"title": "Wioski Świata Park Edukacyjny", "place_type": "Nauka przez zabawę", "district": "Dębniki", "lat": 50.0340, "lng": 19.9200,
     "description_short": "Kultury świata.",
     "description_long": "Poznawanie różnych kultur poprzez rekonstrukcje.",
     "address": "Kraków", "source_url": "https://wioskiswiata.org", "is_indoor": False},

    {"title": "Muzeum Witrażu", "place_type": "Kreatywność i warsztaty", "district": "Zwierzyniec", "lat": 50.0510, "lng": 19.9250,
     "description_short": "Warsztaty witrażu.",
     "description_long": "Pokazy tworzenia witraży i warsztaty.",
     "address": "al. Krasińskiego 23", "source_url": "https://muzeumwitrazu.pl", "is_indoor": True},

    {"title": "Muzeum Czekolady", "place_type": "Kreatywność i warsztaty", "district": "Stare Miasto", "lat": 50.0612, "lng": 19.9370,
     "description_short": "Warsztaty czekoladowe.",
     "description_long": "Tworzenie własnej czekolady podczas warsztatów.",
     "address": "Kraków", "source_url": "https://chocolatemuseum.pl", "is_indoor": True},

    {"title": "Pałac Krzysztofory", "place_type": "Oglądanie / kultura", "district": "Stare Miasto", "lat": 50.0618, "lng": 19.9375,
     "description_short": "Muzeum miasta.",
     "description_long": "Oddział Muzeum Krakowa z wystawami dla rodzin.",
     "address": "Rynek Główny 35", "source_url": "https://muzeumkrakowa.pl", "is_indoor": True},

    {"title": "Smart Kids Planet", "place_type": "Nauka przez zabawę", "district": "Stare Miasto", "lat": 50.0675, "lng": 19.9450,
     "description_short": "Edukacyjne instalacje.",
     "description_long": "Interaktywne wydarzenia edukacyjne dla dzieci.",
     "address": "Kraków", "source_url": "https://smartkidsplanet.pl", "is_indoor": True},

    {"title": "Klub Rodziców Bronowice", "place_type": "Kreatywność i warsztaty", "district": "Bronowice", "lat": 50.0850, "lng": 19.8900,
     "description_short": "Zajęcia dla dzieci.",
     "description_long": "Warsztaty i spotkania dla rodzin.",
     "address": "ul. Wizjonerów", "source_url": "https://krakow.pl", "is_indoor": True},

    {"title": "Bawialnia Kropka", "place_type": "Szybka rozrywka / atrakcje", "district": "Krowodrza", "lat": 50.0750, "lng": 19.9300,
     "description_short": "Sala zabaw.",
     "description_long": "Indoor przestrzeń zabawy dla dzieci.",
     "address": "ul. Wrocławska 53", "source_url": "https://bawialniakropka.pl", "is_indoor": True},

    {"title": "Maskotkolandia", "place_type": "Szybka rozrywka / atrakcje", "district": "Podgórze", "lat": 50.0300, "lng": 19.9600,
     "description_short": "Tematyczna sala zabaw.",
     "description_long": "Przestrzeń zabawy z atrakcjami ruchowymi.",
     "address": "Kraków", "source_url": "https://maskotkolandia.pl", "is_indoor": True},

    {"title": "Smocza Jama", "place_type": "Oglądanie / kultura", "district": "Stare Miasto", "lat": 50.0535, "lng": 19.9345,
     "description_short": "Jaskinia smoka.",
     "description_long": "Krótka jaskinia związana z legendą smoka wawelskiego.",
     "address": "Wawel", "source_url": "https://wawel.krakow.pl", "is_indoor": True}
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
            headers={"User-Agent": "niesiedzwdomu/1.0"},
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

        row = {
            "title": place["title"],
            "slug": slug,
            "description_short": place["description_short"],
            "description_long": place.get("description_long", ""),
            "place_type": place["place_type"],
            "is_indoor": place.get("is_indoor", False),
            "address": place["address"],
            "district": place.get("district", "Inne"),
            "lat": place.get("lat"),
            "lng": place.get("lng"),
            "source_url": place.get("source_url"),
            "is_free": place.get("is_free", False),
            "status": "published",
        }

        db.table("places").insert(row).execute()
        logger.info("  Inserted: %s", place["title"])

    logger.info("Done! Seeded %d places", len(PLACES))


if __name__ == "__main__":
    main()
