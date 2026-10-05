"""Fail release builds if signing identity or install metadata changes."""

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

ABI_CODES = {"armeabi-v7a": 1, "arm64-v8a": 2, "x86_64": 4}


def signing_certificate(signature: str):
    # apksigner prints SDK ranges instead of signer numbers for v3.1 signatures.
    # The same certificate can appear once for each supported SDK range.
    fingerprints = re.findall(
        r"^Signer (?:#[0-9]+|\(minSdkVersion=[^\n]+\)) certificate SHA-256 digest:\s*([a-fA-F0-9]{64})\s*$",
        signature, re.M)
    signer_count = re.search(r"^Number of signers:\s*([0-9]+)\s*$", signature, re.M)
    certificates = {value.lower() for value in fingerprints}
    if not signer_count or signer_count[1] != "1" or len(certificates) != 1:
        raise ValueError(f"Expected exactly one APK signing identity; apksigner output:\n{signature}")
    return certificates.pop()


def verify_metadata(badging: str, signature: str, version: str, code: int, abi: str, expected_cert: str):
    package = re.search(r"^package: name='([^']+)' versionCode='([0-9]+)' versionName='([^']+)'", badging, re.M)
    sdk = re.search(r"^sdkVersion:'([0-9]+)'", badging, re.M)
    native = re.search(r"^native-code:\s*'([^']+)'\s*$", badging, re.M)
    if not package or package.groups() != ("ac.id.untidar.karsa_mobile", str(code), version):
        raise ValueError("APK package/version does not match release inputs")
    if not sdk or sdk[1] != "24" or not native or native[1] != abi:
        raise ValueError("APK Android/ABI requirements changed")
    if signing_certificate(signature) != expected_cert.lower():
        raise ValueError("APK signing certificate does not match the existing release; updates would fail")


def verify_manifest_security(xmltree: str):
    if not re.search(r'android:allowBackup[^\n]*\(type 0x12\)0x0\b', xmltree):
        raise ValueError("APK must disable automatic backup")
    if not re.search(r'android:name[^\n]*"flutter_deeplinking_enabled"[^\n]*\n\s*A: android:value[^\n]*\(type 0x12\)0x0\b', xmltree):
        raise ValueError("APK must use app_links instead of Flutter's built-in deep link handler")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apk-dir", type=Path, required=True)
    parser.add_argument("--sdk", type=Path, required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--build-number", type=int, required=True)
    parser.add_argument("--validation-build", action="store_true", help="Check a non-production build without requiring the production signing key")
    args = parser.parse_args()
    candidates = [directory for directory in (args.sdk / "build-tools").iterdir()
                  if (directory / "apksigner").is_file() and (directory / "aapt").is_file()]
    build_tools = max(candidates, key=lambda path: tuple(int(n) for n in re.findall(r"\d+", path.name)))
    cert = Path("karsa-mobile/android/release-cert.sha256").read_text().strip()
    if not re.fullmatch(r"[a-f0-9]{64}", cert):
        raise ValueError("Invalid pinned signing fingerprint")
    artifacts = []
    for abi, abi_code in ABI_CODES.items():
        apk = args.apk_dir / f"app-{abi}-release.apk"
        signature = subprocess.check_output([str(build_tools / "apksigner"), "verify", "--verbose", "--print-certs", str(apk)], text=True)
        badging = subprocess.check_output([str(build_tools / "aapt"), "dump", "badging", str(apk)], text=True)
        xmltree = subprocess.check_output([str(build_tools / "aapt"), "dump", "xmltree", str(apk), "AndroidManifest.xml"], text=True)
        # Keep Flutter split APK versionCodes compatible with the published 2.0.7.
        code = abi_code * 1000 + args.build_number
        actual_cert = signing_certificate(signature)
        expected_cert = actual_cert if args.validation_build else cert
        verify_metadata(badging, signature, args.version, code, abi, expected_cert)
        verify_manifest_security(xmltree)
        artifacts.append({"file": apk.name, "versionCode": code, "abi": abi,
                          "sha256": hashlib.sha256(apk.read_bytes()).hexdigest(), "certificateSha256": actual_cert})
    (args.apk_dir / "release-metadata.json").write_text(json.dumps({"version": args.version, "productionSigning": not args.validation_build, "apks": artifacts}, indent=2) + "\n")
    print(f"Verified signatures and install metadata for {len(artifacts)} APKs")


if __name__ == "__main__":
    main()
