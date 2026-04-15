#!/usr/bin/env python3
"""Append the freshly-built version to manifest.json.

Reads environment variables set by the release workflow and writes an updated
manifest.json so Jellyfin can install the new release via the repository URL.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

PLUGIN_GUID = "b3f21054-8d26-4d41-946e-da7738c33312"
PLUGIN_NAME = "Movable and Sizable Subtitles"
PLUGIN_DESCRIPTION = (
    "Better subtitle control for Jellyfin. Drag subtitles to reposition "
    "them and scroll/pinch to resize on the fly."
)
PLUGIN_OVERVIEW = (
    "Drag subtitles to reposition them and scroll/pinch to resize on the fly."
)
PLUGIN_OWNER = "RobinNotHood"
PLUGIN_CATEGORY = "General"
TARGET_ABI = "10.9.0.0"


def main() -> None:
    version = os.environ["VERSION"]
    checksum = os.environ["CHECKSUM"]
    timestamp = os.environ["TIMESTAMP"]
    zip_name = os.environ["ZIP"]
    repo = os.environ["REPO"]

    source_url = (
        f"https://github.com/{repo}/releases/download/v{version}/{zip_name}"
    )

    manifest_path = Path("manifest.json")
    if manifest_path.exists():
        data = json.loads(manifest_path.read_text() or "[]")
    else:
        data = []

    if not data:
        data = [
            {
                "category": PLUGIN_CATEGORY,
                "guid": PLUGIN_GUID,
                "name": PLUGIN_NAME,
                "description": PLUGIN_DESCRIPTION,
                "overview": PLUGIN_OVERVIEW,
                "owner": PLUGIN_OWNER,
                "versions": [],
            }
        ]

    entry = data[0]
    versions = entry.setdefault("versions", [])

    assembly_version = f"{version}.0" if version.count(".") == 2 else version
    new_version = {
        "version": assembly_version,
        "changelog": f"Release v{version}",
        "targetAbi": TARGET_ABI,
        "sourceUrl": source_url,
        "checksum": checksum,
        "timestamp": timestamp,
    }

    # Replace any existing entry for the same version, else prepend.
    versions = [v for v in versions if v.get("version") != new_version["version"]]
    versions.insert(0, new_version)
    entry["versions"] = versions

    manifest_path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Wrote {manifest_path} with version {assembly_version}")


if __name__ == "__main__":
    main()
