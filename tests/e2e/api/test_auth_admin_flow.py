import unittest

from tests.e2e.helpers import api_client, read_admin_bootstrap, unique_identity


class AuthAdminFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = api_client()
        cls.admin_credentials = read_admin_bootstrap()

    def test_register_region_visibility_and_ban_flow(self) -> None:
        identity = unique_identity("auth-flow")
        registration = self.client.request(
            "POST",
            "/auth/register",
            body=identity,
            expected_status=201,
        )
        self.assertEqual(registration["login"], identity["login"])
        self.assertEqual(registration["username"], identity["username"])

        login = self.client.request(
            "POST",
            "/auth/login",
            body={"login": identity["login"], "password": identity["password"]},
        )
        user_token = login["token"]

        region = self.client.request(
            "POST",
            "/auth/region",
            body={"regionCode": "GR"},
            token=user_token,
        )
        self.assertEqual(region["region_code"], "GR")

        visibility = self.client.request(
            "POST",
            "/auth/visibility",
            body={"visibility": "private"},
            token=user_token,
        )
        self.assertEqual(visibility["visibility"], "private")

        current_user = self.client.request("GET", "/auth/me", token=user_token)
        self.assertEqual(current_user["region_code"], "GR")
        self.assertEqual(current_user["visibility"], "private")

        admin = self.client.request(
            "POST",
            "/auth/login",
            body={
                "login": self.admin_credentials["login"],
                "password": self.admin_credentials["password"],
            },
        )
        admin_token = admin["token"]
        users = self.client.request("GET", "/admin/users", token=admin_token)["users"]

        created_user = next(user for user in users if user["login"] == identity["login"])
        admin_user = next(user for user in users if user["login"] == self.admin_credentials["login"])

        admin_ban_rejected = self.client.request(
            "POST",
            f"/admin/users/{admin_user['user_id']}/ban",
            body={"isBanned": True},
            token=admin_token,
            expected_status=403,
        )
        self.assertIn("admin accounts cannot be banned", admin_ban_rejected["error"])

        ban_result = self.client.request(
            "POST",
            f"/admin/users/{created_user['user_id']}/ban",
            body={"isBanned": True},
            token=admin_token,
        )
        self.assertTrue(ban_result["user"]["is_banned"])

        banned_profile = self.client.request(
            "GET",
            "/auth/me",
            token=user_token,
            expected_status=403,
        )
        self.assertIn("banned", banned_profile["error"].lower())


if __name__ == "__main__":
    unittest.main()
