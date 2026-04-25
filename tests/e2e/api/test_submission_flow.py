import unittest

from tests.e2e.helpers import api_client, unique_identity


PYTHON_ACCEPTED_SOURCE = """print("statecode")"""


class SubmissionFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = api_client()

    def test_submission_acceptance_marks_problem_as_solved(self) -> None:
        identity = unique_identity("submission-flow")
        registration = self.client.request(
            "POST",
            "/auth/register",
            body=identity,
            expected_status=201,
        )
        token = registration["token"]

        problems_payload = self.client.request("GET", "/problems", token=token)
        self.assertTrue(problems_payload["categories"])
        self.assertTrue(problems_payload["problems"])

        problem = next(
            item for item in problems_payload["problems"] if "Python 3.12" in item["languages"]
        )

        run_result = self.client.request(
            "POST",
            "/submissions/run",
            body={
                "problemId": problem["problem_id"],
                "language": "Python 3.12",
                "source": PYTHON_ACCEPTED_SOURCE,
                "expectedStdout": "statecode\n",
            },
        )
        self.assertEqual(run_result["verdict"], "accepted")
        self.assertEqual(run_result["stdout"].replace("\r\n", "\n"), "statecode\n")

        complete = self.client.request(
            "POST",
            "/submissions/complete",
            body={
                "problemId": problem["problem_id"],
                "problemSlug": problem["slug"],
                "problemTitle": problem["title"],
            },
            token=token,
        )
        self.assertGreaterEqual(complete["solved_problems"], 1)

        refreshed = self.client.request("GET", "/problems", token=token)
        refreshed_problem = next(
            item for item in refreshed["problems"] if item["problem_id"] == problem["problem_id"]
        )
        self.assertTrue(refreshed_problem["solved_by_current_user"])
        self.assertGreaterEqual(refreshed_problem["solved_count"], 1)

        operations = self.client.request("GET", "/operations")
        self.assertTrue(operations["notes"])
        self.assertTrue(operations["metrics"])

        trace = self.client.request(
            "POST",
            "/operations/actions",
            body={"action": "Open submission trace"},
        )
        self.assertIn("Trace opened", trace["message"])
        self.assertIsNotNone(trace["details"])

        drain = self.client.request(
            "POST",
            "/operations/actions",
            body={"action": "Drain noisy worker"},
        )
        self.assertIn("drained", drain["message"].lower())


if __name__ == "__main__":
    unittest.main()
