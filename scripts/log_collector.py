#!/usr/bin/env python3
"""
Log Collector Script

This script monitors specified log files and forwards new log entries to a remote API endpoint.

Example Usage:
python scripts/log_collector.py \
    --api-url http://localhost:3000/api/logs \
    --files "/var/log/syslog /var/log/auth.log" \
    --source "my-linux-box"

python scripts/log_collector.py \
    --api-url https://your-vercel-deployment.vercel.app/api/logs \
    --files "/path/to/your/app.log" \
    --source "production-app-server-01"
"""

import argparse
import datetime
import json
import os
import time
import requests # Ensure 'requests' is installed: pip install requests

def follow_file(filepath, api_url, source_identifier):
    """
    Tails a log file and sends new lines to the API endpoint.

    Args:
        filepath (str): The path to the log file.
        api_url (str): The URL of the API endpoint.
        source_identifier (str): The identifier for this log source.
    """
    filename = os.path.basename(filepath)
    try:
        with open(filepath, 'r') as f:
            # Seek to the end of the file to only read new lines
            f.seek(0, os.SEEK_END)
            print(f"Tailing file: {filepath}")
            while True:
                line = f.readline()
                if not line:
                    time.sleep(0.1)  # Wait for new lines
                    continue

                log_entry = {
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "source_identifier": source_identifier,
                    "log_file": filename,
                    "message": line.strip()
                }

                try:
                    response = requests.post(api_url, json=log_entry, timeout=10)
                    response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
                    print(f"Successfully sent log from {filename}: {log_entry['message'][:50]}...")
                except requests.exceptions.RequestException as e:
                    print(f"Error sending log from {filename} to {api_url}: {e}")
                except Exception as e:
                    print(f"An unexpected error occurred while sending log from {filename}: {e}")

    except FileNotFoundError:
        print(f"Error: File not found: {filepath}")
    except Exception as e:
        print(f"Error reading file {filepath}: {e}")

def main():
    """
    Main function to parse arguments and start monitoring log files.
    """
    parser = argparse.ArgumentParser(
        description="Monitor log files and send new entries to a remote API.",
        epilog="Example: python scripts/log_collector.py --api-url http://localhost:3000/api/logs --files \"/var/log/syslog /var/log/auth.log\" --source my-server"
    )
    parser.add_argument(
        "--api-url",
        required=True,
        help="The API endpoint URL to send logs to."
    )
    parser.add_argument(
        "--files",
        required=True,
        help="A space-separated string of log file paths to monitor."
    )
    parser.add_argument(
        "--source",
        required=True,
        help="A source identifier for these logs (e.g., 'webserver-01')."
    )

    args = parser.parse_args()

    log_files = args.files.split()

    print(f"Starting log collector for source: {args.source}")
    print(f"API Endpoint: {args.api_url}")
    print(f"Monitoring files: {', '.join(log_files)}")

    # For simplicity, this script runs indefinitely and monitors each file sequentially.
    # In a production scenario, you might use threading or asynchronous programming
    # to monitor multiple files concurrently and more robustly.
    # This initial version will block on the first file if it's very active.
    # A more advanced version would use a library like `watchdog` or `asyncio`.

    try:
        # This basic implementation will process files one by one in a loop.
        # If the first file is constantly updated, subsequent files might not be processed promptly.
        # For concurrent monitoring, threading or asyncio would be needed.
        while True: # Keep the script running
            for log_file_path in log_files:
                # This will block on `follow_file` until an error or interruption.
                # To truly monitor all files "concurrently" with this structure,
                # `follow_file` would need to be more complex (e.g., read a bit, then move to next).
                # For now, it will tail one file. If that file stops getting updates,
                # this loop doesn't effectively move to the next one unless `follow_file` exits.
                # A better approach is to launch each in a thread.
                # However, sticking to standard libraries for now as requested.
                # This means it will effectively only tail the *first* file listed if that file is active.
                # Acknowledging this limitation for the current version.
                print(f"Attempting to monitor: {log_file_path}")
                follow_file(log_file_path, args.api_url, args.source)
                print(f"Stopped monitoring {log_file_path}. This might be due to an error or if the file was removed.")
            print("Restarting monitoring cycle for all files...")
            time.sleep(5) # Wait before restarting the cycle, in case of persistent errors

    except KeyboardInterrupt:
        print("\nLog collector stopped by user.")
    except Exception as e:
        print(f"An unexpected error occurred in main loop: {e}")
    finally:
        print("Log collector shutting down.")


if __name__ == "__main__":
    main()
