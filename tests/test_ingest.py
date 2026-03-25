"""Essential tests for Phase 1 ingest: URL filtering, absolute URLs, extraction chain."""

from __future__ import annotations

import json
import unittest

from backend.ingest.discover import discover_event_urls, is_event_url, make_absolute
from backend.ingest.extract import extract_event
from backend.ingest.models import EventData


# ════════════════════════════════════════════════════════════════════
# URL filtering
# ════════════════════════════════════════════════════════════════════

class TestIsEventUrl(unittest.TestCase):

    def test_event_paths_accepted(self):
        self.assertTrue(is_event_url("https://example.com/wydarzenia/koncert-abc"))
        self.assertTrue(is_event_url("https://example.com/koncert/rock-night"))
        self.assertTrue(is_event_url("https://example.com/spektakl/dzieci-show"))
        self.assertTrue(is_event_url("https://example.com/oferta/wydarzenie/test"))
        self.assertTrue(is_event_url("https://biletyna.pl/dla-dzieci/Show/Krakow"))

    def test_static_assets_rejected(self):
        self.assertFalse(is_event_url("https://example.com/style.css"))
        self.assertFalse(is_event_url("https://example.com/image.png"))
        self.assertFalse(is_event_url("https://example.com/script.js"))
        self.assertFalse(is_event_url("https://example.com/doc.pdf"))

    def test_blacklisted_paths_rejected(self):
        self.assertFalse(is_event_url("https://example.com/login"))
        self.assertFalse(is_event_url("https://example.com/regulamin"))
        self.assertFalse(is_event_url("https://example.com/api/data"))
        self.assertFalse(is_event_url("javascript:void(0)"))
        self.assertFalse(is_event_url("mailto:test@x.com"))
        self.assertFalse(is_event_url("tel:+48123"))

    def test_shallow_path_rejected(self):
        # Single-segment path is not a detail page
        self.assertFalse(is_event_url("https://example.com/about"))

    def test_deep_path_accepted(self):
        # Two segments deep might be a detail page
        self.assertTrue(is_event_url("https://example.com/shows/spring-2026"))


# ════════════════════════════════════════════════════════════════════
# Absolute URL building
# ════════════════════════════════════════════════════════════════════

class TestMakeAbsolute(unittest.TestCase):

    def test_relative_resolved(self):
        self.assertEqual(
            make_absolute("/event/123", "https://example.com/listing"),
            "https://example.com/event/123",
        )

    def test_absolute_unchanged(self):
        self.assertEqual(
            make_absolute("https://other.com/event/1", "https://example.com/"),
            "https://other.com/event/1",
        )

    def test_anchor_returns_none(self):
        self.assertIsNone(make_absolute("#section", "https://example.com/"))

    def test_javascript_returns_none(self):
        self.assertIsNone(make_absolute("javascript:void(0)", "https://example.com/"))

    def test_mailto_returns_none(self):
        self.assertIsNone(make_absolute("mailto:a@b.com", "https://example.com/"))

    def test_empty_returns_none(self):
        self.assertIsNone(make_absolute("", "https://example.com/"))


# ════════════════════════════════════════════════════════════════════
# Discover (integration with HTML)
# ════════════════════════════════════════════════════════════════════

class TestDiscoverEventUrls(unittest.TestCase):

    def test_finds_event_links(self):
        html = """
        <html><body>
            <a href="/wydarzenia/koncert-abc">Concert</a>
            <a href="/wydarzenia/spektakl-xyz">Show</a>
            <a href="/kontakt">Contact</a>
            <a href="/style.css">Styles</a>
        </body></html>
        """
        urls = discover_event_urls(html, "https://example.com")
        self.assertEqual(len(urls), 2)
        self.assertIn("https://example.com/wydarzenia/koncert-abc", urls)
        self.assertIn("https://example.com/wydarzenia/spektakl-xyz", urls)

    def test_deduplicates_within_page(self):
        html = """
        <html><body>
            <a href="/wydarzenia/same-event">Event</a>
            <a href="/wydarzenia/same-event">Event again (slider dupe)</a>
            <a href="/wydarzenia/same-event/">With trailing slash</a>
        </body></html>
        """
        urls = discover_event_urls(html, "https://example.com")
        self.assertEqual(len(urls), 1)


# ════════════════════════════════════════════════════════════════════
# Extraction chain
# ════════════════════════════════════════════════════════════════════

class TestExtractJsonLd(unittest.TestCase):

    def _html(self, ld: dict | list) -> str:
        return f"""
        <html><head>
        <script type="application/ld+json">{json.dumps(ld)}</script>
        </head><body><p>body</p></body></html>
        """

    def test_basic_event(self):
        ld = {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "Koncert jazzowy",
            "startDate": "2026-04-01T19:00:00+02:00",
            "location": {
                "@type": "Place",
                "name": "Klub Jazzowy",
                "address": {"addressLocality": "Kraków"},
            },
            "image": "https://img.example.com/jazz.jpg",
            "description": "Wieczór jazzowy z najlepszymi muzykami.",
        }
        ev = extract_event(self._html(ld), "https://example.com/event/1")
        self.assertEqual(ev.title, "Koncert jazzowy")
        self.assertEqual(ev.start_at_raw, "2026-04-01T19:00:00+02:00")
        self.assertEqual(ev.venue_name, "Klub Jazzowy")
        self.assertEqual(ev.city, "Kraków")
        self.assertEqual(ev.image_url, "https://img.example.com/jazz.jpg")
        self.assertIn("json_ld", ev.source)

    def test_free_event(self):
        ld = {"@type": "Event", "name": "Free show", "startDate": "2026-05-01", "isAccessibleForFree": True}
        ev = extract_event(self._html(ld), "https://example.com/e")
        self.assertEqual(ev.price, "0")

    def test_event_with_offers(self):
        ld = {
            "@type": "Event", "name": "Paid",
            "startDate": "2026-06-01",
            "offers": {"@type": "Offer", "price": "45", "priceCurrency": "PLN"},
        }
        ev = extract_event(self._html(ld), "https://example.com/e")
        self.assertEqual(ev.price, "45")

    def test_invalid_json_ld_ignored(self):
        html = '<html><head><script type="application/ld+json">{not json</script></head><body></body></html>'
        ev = extract_event(html, "https://example.com/e")
        self.assertEqual(ev.title, "")  # nothing extracted, no crash

    def test_non_event_type_ignored(self):
        ld = {"@type": "Organization", "name": "Some Org"}
        ev = extract_event(self._html(ld), "https://example.com/e")
        # Title should NOT be "Some Org" – it's not an Event
        self.assertNotEqual(ev.title, "Some Org")


class TestExtractFallbackChain(unittest.TestCase):

    def test_opengraph_when_no_json_ld(self):
        html = """
        <html><head>
            <meta property="og:title" content="OG Event Title"/>
            <meta property="og:description" content="A great event."/>
            <meta property="og:image" content="https://img.example.com/og.jpg"/>
        </head><body></body></html>
        """
        ev = extract_event(html, "https://example.com/e")
        self.assertEqual(ev.title, "OG Event Title")
        self.assertEqual(ev.image_url, "https://img.example.com/og.jpg")
        self.assertIn("A great event", ev.description_short)

    def test_css_when_no_meta(self):
        html = """
        <html><body>
            <h1>CSS Title</h1>
            <time datetime="2026-07-15T10:00:00">15 lipca 2026</time>
            <div class="venue">Hala Wisły</div>
        </body></html>
        """
        ev = extract_event(html, "https://example.com/e")
        self.assertEqual(ev.title, "CSS Title")
        self.assertEqual(ev.start_at_raw, "2026-07-15T10:00:00")
        self.assertEqual(ev.venue_name, "Hala Wisły")

    def test_regex_date_fallback(self):
        html = "<html><body><p>Wydarzenie 25.12.2026 godz. 18:00</p></body></html>"
        ev = extract_event(html, "https://example.com/e")
        self.assertIn("25.12.2026", ev.start_at_raw)
        self.assertIn("18:00", ev.start_at_raw)

    def test_regex_free_fallback(self):
        html = "<html><body><p>Wstęp wolny dla wszystkich!</p></body></html>"
        ev = extract_event(html, "https://example.com/e")
        self.assertEqual(ev.price, "0")

    def test_regex_price_fallback(self):
        html = "<html><body><p>Bilety od 35 zł</p></body></html>"
        ev = extract_event(html, "https://example.com/e")
        self.assertIn("35", ev.price)


class TestExtractGraphEvents(unittest.TestCase):

    def test_graph_with_multiple_events(self):
        ld = {
            "@context": "https://schema.org",
            "@graph": [
                {"@type": "Event", "name": "Event A", "startDate": "2026-03-01"},
                {"@type": "Event", "name": "Event B", "startDate": "2026-03-02"},
            ]
        }
        html = f'<html><head><script type="application/ld+json">{json.dumps(ld)}</script></head><body></body></html>'
        # extract_event returns only one (the first), which is fine for detail pages
        ev = extract_event(html, "https://example.com/e")
        self.assertEqual(ev.title, "Event A")


class TestEventDataModel(unittest.TestCase):

    def test_to_dict(self):
        ev = EventData(title="Test", confidence=0.8)
        d = ev.to_dict()
        self.assertEqual(d["title"], "Test")
        self.assertEqual(d["confidence"], 0.8)
        self.assertIsInstance(d, dict)


if __name__ == "__main__":
    unittest.main()
