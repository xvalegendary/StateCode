import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any


API_BASE_URL = os.environ.get("STATECODE_API_URL", "http://localhost:4000").rstrip("/")
WEB_BASE_URL = os.environ.get("STATECODE_WEB_URL", "http://localhost:3000").rstrip("/")
ADMIN_BOOTSTRAP_PATH = os.environ.get("STATECODE_ADMIN_BOOTSTRAP_PATH", "").strip()


class HttpAssertionError(AssertionError):
    pass


def unique_identity(prefix: str) -> dict[str, str]:
    suffix = uuid.uuid4().hex[:10]
    return {
        "login": f"{prefix}-{suffix}",
        "username": f"@{prefix}-{suffix}",
        "password": f"{prefix}-pass-1234",
    }


def parse_json_bytes(payload: bytes) -> Any:
    text = payload.decode("utf-8") if payload else ""
    if not text:
        return {}
    return json.loads(text)


def read_admin_bootstrap(path: str | None = None) -> dict[str, str]:
    target = (path or ADMIN_BOOTSTRAP_PATH).strip()
    if not target:
        raise HttpAssertionError("STATECODE_ADMIN_BOOTSTRAP_PATH is not set")

    result: dict[str, str] = {}
    with open(target, "r", encoding="utf-8") as handle:
        for line in handle:
            if "=" not in line:
                continue
            key, value = line.strip().split("=", 1)
            result[key] = value

    if not result.get("login") or not result.get("password"):
        raise HttpAssertionError(f"failed to parse bootstrap credentials from {target}")

    return result


class JsonHttpClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        token: str | None = None,
        expected_status: int = 200,
    ) -> Any:
        url = f"{self.base_url}{path}"
        data = None if body is None else json.dumps(body).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        request = urllib.request.Request(url, data=data, headers=headers, method=method.upper())

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = parse_json_bytes(response.read())
                if response.status != expected_status:
                    raise HttpAssertionError(
                        f"{method} {path} returned {response.status}, expected {expected_status}: {payload}"
                    )
                return payload
        except urllib.error.HTTPError as error:
            payload = parse_json_bytes(error.read())
            if error.code == expected_status:
                return payload
            raise HttpAssertionError(
                f"{method} {path} returned {error.code}, expected {expected_status}: {payload}"
            ) from error

    def get_text(self, path: str, expected_status: int = 200) -> str:
        url = f"{self.base_url}{path}"
        request = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = response.read().decode("utf-8")
                if response.status != expected_status:
                    raise HttpAssertionError(
                        f"GET {path} returned {response.status}, expected {expected_status}"
                    )
                return payload
        except urllib.error.HTTPError as error:
            if error.code != expected_status:
                raise HttpAssertionError(
                    f"GET {path} returned {error.code}, expected {expected_status}"
                ) from error
            return error.read().decode("utf-8")


def wait_for_http(url: str, timeout_seconds: int = 60) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5):
                return
        except Exception:
            time.sleep(1)

    raise HttpAssertionError(f"timed out waiting for {url}")


def api_client() -> JsonHttpClient:
    return JsonHttpClient(API_BASE_URL)


def web_client() -> JsonHttpClient:
    return JsonHttpClient(WEB_BASE_URL)

