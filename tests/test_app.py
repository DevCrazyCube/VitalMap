"""Tests for the Flask app: the pages, the dataset behind /api/data and the contact form.

    python -m unittest discover -s tests

They use Flask's test client; no server is started and no browser is needed. Contact messages go to a
temporary file, never to submissions/messages.json.
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app as vitalmap  # noqa: E402


class Pages(unittest.TestCase):
    def setUp(self):
        self.client = vitalmap.app.test_client()

    def test_every_page_answers(self):
        for path in ("/", "/visualization", "/contact"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_an_unknown_page_is_a_404(self):
        self.assertEqual(self.client.get("/nope").status_code, 404)


class Dataset(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = vitalmap.load_dataset()

    def test_a_row_has_the_six_fields(self):
        self.assertEqual(set(self.rows[0]),
                         {"entity", "code", "year", "births", "deaths", "natural_growth"})

    def test_it_runs_from_1950_to_2100(self):
        years = {row["year"] for row in self.rows}
        self.assertEqual((min(years), max(years)), (1950, 2100))

    def test_natural_growth_is_births_minus_deaths(self):
        for row in self.rows[::500]:
            self.assertEqual(row["natural_growth"], row["births"] - row["deaths"])

    def test_estimates_win_and_projections_fill_in(self):
        """Afghanistan 1950 is the first data row of the file: an estimate of 383,985 births."""
        row = next(r for r in self.rows if r["code"] == "AFG" and r["year"] == 1950)
        self.assertEqual((row["births"], row["deaths"]), (383985.0, 290972.0))
        later = [r for r in self.rows if r["code"] == "AFG" and r["year"] == 2100]
        self.assertEqual(len(later), 1, "a projected year must be there too")

    def test_one_row_per_country_and_year(self):
        keys = [(row["entity"], row["year"]) for row in self.rows]
        self.assertEqual(len(keys), len(set(keys)))

    def test_the_api_sends_the_same_rows(self):
        answer = vitalmap.app.test_client().get("/api/data")
        self.assertEqual(answer.status_code, 200)
        self.assertEqual(len(answer.get_json()), len(self.rows))

    def test_the_file_is_read_once(self):
        self.assertIs(vitalmap.load_dataset(), vitalmap.load_dataset())


class Contact(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.file = os.path.join(self.folder.name, "inbox", "messages.json")
        self.before = vitalmap.app.config["SUBMISSIONS_FILE"]
        vitalmap.app.config["SUBMISSIONS_FILE"] = self.file
        self.addCleanup(vitalmap.app.config.__setitem__, "SUBMISSIONS_FILE", self.before)
        self.client = vitalmap.app.test_client()

    def post(self, **form):
        return self.client.post("/contact", data=form, follow_redirects=True)

    def test_a_full_message_is_saved(self):
        page = self.post(name="Ada", email="ada@example.com", message="Hello")
        self.assertIn(b"submitted successfully", page.data)
        with open(self.file, encoding="utf-8") as f:
            saved = json.load(f)
        self.assertEqual(len(saved), 1)
        self.assertEqual((saved[0]["name"], saved[0]["email"], saved[0]["message"]),
                         ("Ada", "ada@example.com", "Hello"))
        self.assertTrue(saved[0]["submitted_at"].endswith("+00:00"), "the time is stored in UTC")

    def test_a_second_message_is_added_to_the_first(self):
        self.post(name="Ada", email="ada@example.com", message="One")
        self.post(name="Bo", email="bo@example.com", message="Two")
        with open(self.file, encoding="utf-8") as f:
            self.assertEqual([m["message"] for m in json.load(f)], ["One", "Two"])

    def test_a_missing_field_saves_nothing(self):
        for form in ({"name": "", "email": "a@example.com", "message": "x"},
                     {"name": "Ada", "email": "", "message": "x"},
                     {"name": "Ada", "email": "a@example.com", "message": "   "}):
            with self.subTest(form=form):
                page = self.post(**form)
                self.assertIn(b"Please fill in all fields", page.data)
                self.assertFalse(os.path.exists(self.file))

    def test_a_broken_file_does_not_stop_a_new_message(self):
        os.makedirs(os.path.dirname(self.file))
        with open(self.file, "w", encoding="utf-8") as f:
            f.write("{not json")
        self.post(name="Ada", email="ada@example.com", message="Hello")
        with open(self.file, encoding="utf-8") as f:
            self.assertEqual(len(json.load(f)), 1)


class Config(unittest.TestCase):
    def test_no_key_is_written_in_the_source(self):
        with open(vitalmap.__file__, encoding="utf-8") as f:
            source = f.read()
        self.assertNotIn('secret_key = "', source)
        self.assertTrue(vitalmap.app.secret_key)
        if not os.environ.get("SECRET_KEY"):
            self.assertEqual(len(vitalmap.app.secret_key), 64, "a random key of 32 bytes, as hex")


if __name__ == "__main__":
    unittest.main()
