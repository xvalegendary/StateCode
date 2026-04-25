import unittest
import urllib.parse

from tests.e2e.helpers import web_client


class WebPagesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = web_client()

    def test_login_page_renders(self) -> None:
        html = self.client.get_text("/login")
        self.assertIn("StateCode", html)
        self.assertIn("Login", html)

    def test_banned_page_renders(self) -> None:
        html = self.client.get_text("/banned")
        self.assertIn("Account suspended", html)
        self.assertIn("Access restricted", html)

    def test_public_profile_route_renders(self) -> None:
        html = self.client.get_text(f"/{urllib.parse.quote('@bytemarshal')}")
        self.assertIn("@bytemarshal", html)


if __name__ == "__main__":
    unittest.main()
