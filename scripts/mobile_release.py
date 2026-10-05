"""Validate build inputs before they reach Flutter or a public release."""

import os
import re
from pathlib import Path
from urllib.parse import urlsplit

PRODUCTION_URL = "https://www.sikarsa.id"


def normalize_origin(raw: str) -> str:
    if not re.fullmatch(r"https://[A-Za-z0-9.:-]+/?", raw):
        raise ValueError("API URL must be an HTTPS origin without credentials, path, query or shell characters")
    url = urlsplit(raw)
    host = url.hostname
    if not host or not re.fullmatch(r"[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*", host):
        raise ValueError("Invalid API hostname")
    port = url.port
    if port is not None and not 1 <= port <= 65535:
        raise ValueError("Invalid API port")
    return f"https://{host.lower()}" + (f":{port}" if port and port != 443 else "")


def read_version(pubspec: Path) -> str:
    matches = re.findall(r"^version:\s*([0-9]+\.[0-9]+\.[0-9]+)\+([1-9][0-9]*)\s*$", pubspec.read_text(), re.M)
    if len(matches) != 1:
        raise ValueError("pubspec must contain one version: <major>.<minor>.<patch>+<build>")
    return matches[0][0]


def build_config(env: dict, pubspec: Path) -> dict[str, str]:
    url = normalize_origin(env.get("API_BASE_URL_INPUT") or PRODUCTION_URL)
    requested = env.get("PUBLISH_RELEASE", "false") == "true"
    trusted_main = env.get("GITHUB_REF") == "refs/heads/main" and env.get("GITHUB_EVENT_NAME") in {"push", "workflow_dispatch"}
    if requested and (env.get("GITHUB_EVENT_NAME") != "workflow_dispatch" or not trusted_main or url != PRODUCTION_URL):
        raise ValueError("Public releases require manual dispatch on main with the production API URL")
    build_number = env.get("GITHUB_RUN_NUMBER", "")
    if not re.fullmatch(r"[1-9][0-9]*", build_number):
        raise ValueError("Invalid GitHub build counter")
    version = read_version(pubspec)
    return {
        "api_base_url": url,
        "version": version,
        "tag": f"karsa-v{version}",
        "build_number": build_number,
        "publish": str(requested).lower(),
        "sign_release": str(trusted_main and url == PRODUCTION_URL).lower(),
    }


if __name__ == "__main__":
    try:
        config = build_config(dict(os.environ), Path("karsa-mobile/pubspec.yaml"))
    except ValueError as error:
        raise SystemExit(str(error)) from error
    with Path(os.environ["GITHUB_OUTPUT"]).open("a") as output:
        for key, value in config.items():
            output.write(f"{key}={value}\n")
    print(f"Validated {config['version']}; publish={config['publish']}; signing={config['sign_release']}")
