#!/usr/bin/env python3
"""
Memos Data Export Script

This script exports all memos and attachments from a self-hosted Memos instance.
It requires a valid authentication token for the API.

Usage:
    python export_memos.py --host https://memos.example.com --token YOUR_TOKEN --output /path/to/export
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import requests
from requests.exceptions import RequestException


class MemosExporter:
    """Export memos data and attachments from Memos API."""

    def __init__(self, host: str, token: str, output_dir: str):
        """
        Initialize the exporter.

        Args:
            host: The base URL of the Memos instance (e.g., https://memos.example.com)
            token: The authentication token (typically a JWT)
            output_dir: Directory where to save exported data
        """
        self.host = host.rstrip("/")
        self.token = token
        self.output_dir = Path(output_dir)
        self.attachments_dir = self.output_dir / "attachments"

        # Set up session with auth header
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        self.session.timeout = 30

        self.export_data: Dict[str, Any] = {
            "export_time": datetime.now().isoformat(),
            "host": self.host,
            "user": None,
            "memos": [],
            "summary": {
                "total_memos": 0,
                "total_attachments": 0,
                "export_errors": []
            }
        }

    def ensure_directories(self) -> None:
        """Create necessary directories for export."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.attachments_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ Created output directory: {self.output_dir}")
        print(f"✓ Created attachments directory: {self.attachments_dir}")

    def api_call(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None, timeout: int = 30) -> Dict[str, Any]:
        """
        Make an API call to the Memos instance.

        Args:
            endpoint: The API endpoint (without host)
            method: HTTP method (GET, POST, etc.)
            data: Request body data for POST requests
            timeout: Request timeout in seconds

        Returns:
            Response JSON data

        Raises:
            Exception: If the API call fails
        """
        url = urljoin(self.host, endpoint)
        try:
            if method == "GET":
                response = self.session.get(url, timeout=timeout)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()
        except requests.exceptions.JSONDecodeError as e:
            raise Exception(f"API call to {endpoint} returned invalid JSON: {str(e)}")
        except RequestException as e:
            raise Exception(f"API call failed to {endpoint}: {str(e)}")

    def get_current_user(self) -> Dict[str, Any]:
        """Fetch current authenticated user information."""
        print("\n📋 Fetching current user information...")
        try:
            # Use GetCurrentSession endpoint (REST: /api/v1/auth/sessions/current)
            response = self.api_call("/api/v1/auth/sessions/current")
            user = response.get("user", {})
            self.export_data["user"] = {
                "name": user.get("name"),
                "username": user.get("username"),
                "email": user.get("email"),
                "display_name": user.get("display_name"),
                "role": user.get("role"),
            }
            display_name = user.get("display_name") or user.get("username", "Unknown")
            print(f"✓ Current user: {display_name} ({user.get('email', 'N/A')})")
            return self.export_data["user"]
        except Exception as e:
            print(f"✗ Failed to fetch current user: {e}")
            raise

    def list_memos(self, page_size: int = 1000) -> List[Dict[str, Any]]:
        """
        Fetch all memos for the current user with pagination.

        Args:
            page_size: Maximum number of memos per page

        Returns:
            List of memo objects
        """
        print("\n📝 Fetching memos list...")
        all_memos = []
        page_token = ""

        while True:
            try:
                params = f"/api/v1/memos?pageSize={page_size}"
                if page_token:
                    params += f"&pageToken={page_token}"

                response = self.api_call(params)
                memos = response.get("memos", [])
                all_memos.extend(memos)

                print(f"✓ Fetched {len(memos)} memos (total so far: {len(all_memos)})")

                # Check for next page
                page_token = response.get("nextPageToken", "")
                if not page_token:
                    break
            except Exception as e:
                print(f"✗ Error fetching memos: {e}")
                raise

        print(f"✓ Total memos fetched: {len(all_memos)}")
        return all_memos

    def get_memo_details(self, memo_name: str) -> Dict[str, Any]:
        """
        Fetch detailed information for a specific memo.

        Args:
            memo_name: The memo resource name (e.g., 'memos/1')

        Returns:
            Detailed memo object
        """
        try:
            response = self.api_call(f"/api/v1/{memo_name}")
            return response.get("memo", response)
        except Exception as e:
            print(f"✗ Failed to fetch memo details for {memo_name}: {e}")
            return {}

    def get_memo_attachments(self, memo_name: str) -> List[Dict[str, Any]]:
        """
        Fetch attachments for a specific memo.

        Args:
            memo_name: The memo resource name (e.g., 'memos/1')

        Returns:
            List of attachment objects
        """
        try:
            response = self.api_call(f"/api/v1/{memo_name}/attachments")
            return response.get("attachments", [])
        except Exception as e:
            print(f"  ⚠ Failed to fetch attachments for {memo_name}: {e}")
            return []

    def download_attachment(self, attachment: Dict[str, Any]) -> Optional[str]:
        """
        Download an attachment file.

        Args:
            attachment: The attachment object

        Returns:
            Relative file path if successful, None otherwise
        """
        try:
            attachment_name = attachment.get("name", "")
            filename = attachment.get("filename", "")

            if not attachment_name or not filename:
                print(f"  ⚠ Invalid attachment data: {attachment}")
                return None

            # Build the download URL
            file_url = f"/file/{attachment_name}/{filename}"
            full_url = urljoin(self.host, file_url)

            # Download the file
            response = self.session.get(full_url)
            response.raise_for_status()

            # Save to attachments folder
            file_path = self.attachments_dir / filename
            # Handle duplicate filenames by adding suffix
            counter = 1
            original_stem = file_path.stem
            original_suffix = file_path.suffix
            while file_path.exists():
                file_path = self.attachments_dir / f"{original_stem}_{counter}{original_suffix}"
                counter += 1

            file_path.write_bytes(response.content)
            relative_path = f"attachments/{file_path.name}"
            print(f"  ✓ Downloaded: {relative_path} ({len(response.content)} bytes)")
            return relative_path
        except Exception as e:
            print(f"  ✗ Failed to download attachment {attachment.get('name')}: {e}")
            return None

    def export_memos(self) -> None:
        """Main export process."""
        try:
            # Ensure directories exist
            self.ensure_directories()

            # Get current user
            self.get_current_user()

            # Fetch all memos
            memos = self.list_memos()
            self.export_data["summary"]["total_memos"] = len(memos)

            # Process each memo
            print(f"\n📥 Processing {len(memos)} memos...")
            for idx, memo in enumerate(memos, 1):
                print(f"\n[{idx}/{len(memos)}] Processing memo: {memo.get('name')}")
                try:
                    memo_name = memo.get("name", "")
                    if not memo_name:
                        continue

                    # Get detailed memo info
                    memo_detail = self.get_memo_details(memo_name)
                    if not memo_detail:
                        memo_detail = memo

                    # Fetch and download attachments
                    attachments = self.get_memo_attachments(memo_name)
                    attachment_refs = []

                    for attachment in attachments:
                        relative_path = self.download_attachment(attachment)
                        if relative_path:
                            attachment_refs.append({
                                "id": attachment.get("name", ""),
                                "filename": attachment.get("filename", ""),
                                "file_path": relative_path,
                                "type": attachment.get("type", ""),
                                "size": attachment.get("size", 0),
                                "created_at": attachment.get("createTime", ""),
                            })
                            self.export_data["summary"]["total_attachments"] += 1

                    # Build memo export object
                    memo_export = {
                        "name": memo_detail.get("name", ""),
                        "content": memo_detail.get("content", ""),
                        "created_at": memo_detail.get("createTime", ""),
                        "updated_at": memo_detail.get("updateTime", ""),
                        "display_time": memo_detail.get("displayTime", ""),
                        "visibility": memo_detail.get("visibility", "PRIVATE"),
                        "pinned": memo_detail.get("pinned", False),
                        "tags": memo_detail.get("tags", []),
                        "snippet": memo_detail.get("snippet", ""),
                        "state": memo_detail.get("state", "NORMAL"),
                        "attachments": attachment_refs,
                    }

                    # Add optional fields
                    if "location" in memo_detail and memo_detail["location"]:
                        memo_export["location"] = memo_detail["location"]
                    if "parent" in memo_detail and memo_detail["parent"]:
                        memo_export["parent"] = memo_detail["parent"]
                    if "relations" in memo_detail and memo_detail["relations"]:
                        memo_export["relations"] = memo_detail["relations"]
                    if "reactions" in memo_detail and memo_detail["reactions"]:
                        memo_export["reactions"] = memo_detail["reactions"]

                    self.export_data["memos"].append(memo_export)
                    print(f"✓ Memo processed successfully")

                except Exception as e:
                    error_msg = f"Memo {memo.get('name')}: {str(e)}"
                    print(f"✗ Error processing memo: {error_msg}")
                    self.export_data["summary"]["export_errors"].append(error_msg)

            # Save export data to JSON
            self.save_export_data()
            print("\n" + "=" * 60)
            print("✓ Export completed successfully!")
            print(f"Total memos exported: {len(self.export_data['memos'])}")
            print(f"Total attachments downloaded: {self.export_data['summary']['total_attachments']}")
            if self.export_data["summary"]["export_errors"]:
                print(f"Errors encountered: {len(self.export_data['summary']['export_errors'])}")
            print("=" * 60)

        except Exception as e:
            print(f"\n✗ Export failed: {e}")
            sys.exit(1)

    def save_export_data(self) -> None:
        """Save export data to JSON file."""
        output_file = self.output_dir / "memos_export.json"
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(self.export_data, f, ensure_ascii=False, indent=2)
            print(f"\n✓ Export data saved to: {output_file}")
        except Exception as e:
            print(f"✗ Failed to save export data: {e}")
            raise


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Export Memos data and attachments from a self-hosted instance",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python export_memos.py --host https://memos.example.com --token eyJxxx... --output ./export
  python export_memos.py --host http://localhost:5230 --token token123 --output ~/my_memos
        """
    )

    parser.add_argument(
        "--host",
        required=True,
        help="The host URL of the Memos instance (e.g., https://memos.example.com)"
    )
    parser.add_argument(
        "--token",
        required=True,
        help="Authentication token (JWT). Can be obtained from your Memos profile."
    )
    parser.add_argument(
        "--output",
        default="./memos_export",
        help="Output directory for exported data (default: ./memos_export)"
    )

    args = parser.parse_args()

    # Validate host URL
    if not args.host.startswith(("http://", "https://")):
        print("✗ Error: host must start with http:// or https://")
        sys.exit(1)

    # Create exporter and run
    exporter = MemosExporter(args.host, args.token, args.output)
    exporter.export_memos()


if __name__ == "__main__":
    main()
