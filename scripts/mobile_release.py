"""Validate build inputs and prepare an immutable mobile release version."""

import argparse
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

PRODUCTION_URL = "https://www.sikarsa.id"
VERSION_LINE = re.compile(r"^version:[ \t]*([0-9]+\.[0-9]+\.[0-9]+)\+([1-9][0-9]*)[ \t]*$", re.M)
RELEASE_TAG = re.compile(r"karsa-v([0-9]+)\.([0-9]+)\.([0-9]+)")


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


def read_pubspec_version(pubspec: Path) -> tuple[str, int]:
    matches = VERSION_LINE.findall(pubspec.read_text())
    if len(matches) != 1:
        raise ValueError("pubspec must contain one version: <major>.<minor>.<patch>+<build>")
    return matches[0][0], int(matches[0][1])


def next_release_version(source_version: str, tags: list[str]) -> str:
    source_parts = tuple(int(part) for part in source_version.split("."))
    released = [tuple(int(part) for part in match.groups())
                for tag in tags if (match := RELEASE_TAG.fullmatch(tag.strip()))]
    if not released:
        return source_version
    latest = max(released)
    next_from_tags = (latest[0], latest[1], latest[2] + 1)
    return ".".join(str(part) for part in max(source_parts, next_from_tags))


def write_pubspec_version(pubspec: Path, version: str, build: int) -> None:
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version) or build < 1:
        raise ValueError("Invalid release version")
    read_pubspec_version(pubspec)
    source = pubspec.read_text()
    updated = VERSION_LINE.sub(f"version: {version}+{build}", source, count=1)
    pubspec.write_text(updated)


def build_config(env: dict, pubspec: Path) -> dict[str, str]:
    url = normalize_origin(env.get("API_BASE_URL_INPUT") or PRODUCTION_URL)
    requested = env.get("PUBLISH_RELEASE", "false") == "true"
    trusted_main = env.get("GITHUB_REF") == "refs/heads/main" and env.get("GITHUB_EVENT_NAME") in {"push", "workflow_dispatch"}
    if requested and (env.get("GITHUB_EVENT_NAME") != "workflow_dispatch" or not trusted_main or url != PRODUCTION_URL):
        raise ValueError("Public releases require manual dispatch on main with the production API URL")
    build_number = env.get("GITHUB_RUN_NUMBER", "")
    if not re.fullmatch(r"[1-9][0-9]*", build_number):
        raise ValueError("Invalid GitHub build counter")
    source_version, source_build = read_pubspec_version(pubspec)
    version = source_version
    pubspec_build = source_build
    if requested:
        tags_file = env.get("RELEASE_TAGS_FILE")
        if not tags_file:
            raise ValueError("Release tag list is required before publishing")
        try:
            tags = Path(tags_file).read_text().splitlines()
        except OSError as error:
            raise ValueError("Could not read the release tag list") from error
        version = next_release_version(source_version, tags)
        if version != source_version:
            pubspec_build += 1
    return {
        "api_base_url": url,
        "version": version,
        "tag": f"karsa-v{version}",
        "pubspec_build": str(pubspec_build),
        "build_number": build_number,
        "publish": str(requested).lower(),
        "sign_release": str(trusted_main and url == PRODUCTION_URL).lower(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-pubspec", type=Path)
    parser.add_argument("--version")
    parser.add_argument("--pubspec-build", type=int)
    args = parser.parse_args()
    try:
        if args.write_pubspec is not None:
            if args.version is None or args.pubspec_build is None:
                parser.error("--write-pubspec requires --version and --pubspec-build")
            write_pubspec_version(args.write_pubspec, args.version, args.pubspec_build)
            print(f"Updated {args.write_pubspec} to {args.version}+{args.pubspec_build}")
            return
        if args.version is not None or args.pubspec_build is not None:
            parser.error("--version and --pubspec-build require --write-pubspec")
        config = build_config(dict(os.environ), Path("karsa-mobile/pubspec.yaml"))
    except ValueError as error:
        raise SystemExit(str(error)) from error
    with Path(os.environ["GITHUB_OUTPUT"]).open("a") as output:
        for key, value in config.items():
            output.write(f"{key}={value}\n")
    print(f"Validated {config['version']}; publish={config['publish']}; signing={config['sign_release']}")


if __name__ == "__main__":
    main()
