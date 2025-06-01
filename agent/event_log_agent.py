#!/usr/bin/env python3
import configparser
import subprocess
import requests
import json
import time
import logging
import os
import atexit
import signal
from typing import List, Dict, Any, Optional, Tuple

# --- Global Variables ---
# This buffer will store events with their source identifiers before sending
# Structure: List of tuples: (log_source_identifier, raw_event_data)
event_buffer: List[Tuple[str, Any]] = []
# last_flush_time can be managed per source if needed, or globally as simplified here
last_global_flush_time = time.time()
agent_config: Optional[configparser.ConfigParser] = None
shutdown_flag = False

# --- Logging Setup ---
logger = logging.getLogger("EventLogAgent")

def setup_logging(log_level_str: str = "INFO"):
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)
    logger.setLevel(log_level)
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    if not logger.handlers:
        logger.addHandler(handler)
    logger.info(f"Logging initialized with level: {log_level_str}")


# --- Configuration Loading ---
def load_config(config_file: str = 'config.ini') -> Optional[configparser.ConfigParser]:
    config_path = os.path.join(os.path.dirname(__file__), config_file)
    if not os.path.exists(config_path):
        logger.error(f"Configuration file '{config_path}' not found.")
        return None

    config = configparser.ConfigParser(interpolation=None) # No interpolation for simple key-value
    try:
        config.read(config_path)
        logger.info(f"Configuration loaded from '{config_path}'.")
        return config
    except configparser.Error as e:
        logger.error(f"Error parsing configuration file '{config_path}': {e}")
        return None

# --- Windows Event Log Collection ---
def collect_windows_events(config_section: configparser.SectionProxy) -> List[Any]:
    ps_command = config_section.get('POWERSHELL_COMMAND')
    if not ps_command:
        logger.warning(f"[{config_section.name}] PowerShell command not configured.")
        return []

    logger.debug(f"[{config_section.name}] Executing PowerShell command: {ps_command}")
    try:
        # Using 'powershell.exe' for broader compatibility if pwsh (PowerShell 7+) is not primary.
        # For production, explicitly choose based on environment or configuration.
        process = subprocess.run(['powershell.exe', '-NoProfile', '-Command', ps_command],
                                 capture_output=True, text=True, check=False, timeout=30) # Added timeout

        if process.returncode != 0:
            logger.error(f"[{config_section.name}] PowerShell command failed with code {process.returncode}: {process.stderr[:500]}")
            return []

        stdout = process.stdout.strip()
        if not stdout:
            logger.debug(f"[{config_section.name}] No new events from PowerShell command.")
            return []

        try:
            # Get-WinEvent | ConvertTo-Json usually outputs an array if multiple events,
            # or a single object if only one event.
            events = json.loads(stdout)
            if isinstance(events, dict): # Single event returned
                return [events]
            elif isinstance(events, list): # Array of events
                return events
            else:
                logger.warning(f"[{config_section.name}] PowerShell output was not a JSON object or array: {type(events)}")
                return []
        except json.JSONDecodeError as e:
            logger.error(f"[{config_section.name}] Failed to decode JSON from PowerShell output: {e}. Output (first 500 chars): {stdout[:500]}")
            return []
    except subprocess.TimeoutExpired:
        logger.error(f"[{config_section.name}] PowerShell command timed out after 30 seconds.")
        return []
    except FileNotFoundError:
        logger.error(f"[{config_section.name}] 'powershell.exe' not found. Ensure it's in PATH.")
        return []
    except Exception as e:
        logger.error(f"[{config_section.name}] Error collecting Windows events: {e}")
        return []

# --- File Log Collection (Simplified Placeholder) ---
# A real implementation needs robust state tracking (inode, offset) per file.
file_states: Dict[str, int] = {} # Stores last read position (offset) for each file path

def collect_file_log_lines(file_path: str, source_section_name: str) -> List[Dict[str, str]]:
    logger.debug(f"[{source_section_name}] Checking file: {file_path}")
    if not os.path.exists(file_path):
        logger.warning(f"[{source_section_name}] File not found: {file_path}")
        return []

    new_lines_data = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            last_pos = file_states.get(file_path, 0)
            f.seek(last_pos)

            lines_read_this_cycle = 0
            max_lines_per_cycle = 1000 # Safety break for very busy files

            while lines_read_this_cycle < max_lines_per_cycle:
                line = f.readline()
                if not line:  # End of file
                    break
                line = line.strip()
                if line:
                    new_lines_data.append({"raw_message": line, "source_file": file_path, "timestamp_collected": time.strftime('%Y-%m-%dT%H:%M:%S%z')})
                    lines_read_this_cycle += 1

            current_pos = f.tell()
            file_states[file_path] = current_pos

            if lines_read_this_cycle > 0:
                logger.info(f"[{source_section_name}] Collected {lines_read_this_cycle} new lines from {file_path}.")

    except Exception as e:
        logger.error(f"[{source_section_name}] Error reading file {file_path}: {e}")

    return new_lines_data


# --- Event Batching and Sending ---
def send_batch_to_api(api_url: str, log_source_id: str, event_batch: List[Any], config: configparser.ConfigParser) -> bool:
    global event_buffer # To modify it if send fails and items need to be re-queued (advanced)

    if not event_batch:
        return True

    payload = {
        "log_source_identifier": log_source_id,
        "events": event_batch
    }
    headers = {"Content-Type": "application/json"}

    max_retries = config.getint('DEFAULT', 'MAX_SEND_RETRIES', fallback=3)
    retry_delay = config.getfloat('DEFAULT', 'INITIAL_RETRY_DELAY_SECONDS', fallback=5.0)

    logger.info(f"Sending batch of {len(event_batch)} events for source '{log_source_id}' to {api_url}")

    for attempt in range(max_retries):
        try:
            response = requests.post(api_url, json=payload, headers=headers, timeout=20) # Increased timeout

            logger.debug(f"API response status: {response.status_code}, body: {response.text[:200]}")

            if 200 <= response.status_code < 300:
                try:
                    api_response_json = response.json()
                    logger.info(f"Successfully sent batch for '{log_source_id}'. API: {api_response_json.get('message', 'OK')}, "
                                f"Successful: {api_response_json.get('successful', len(event_batch))}, Failed: {api_response_json.get('failed', 0)}")
                    if api_response_json.get('failed', 0) > 0:
                        logger.warning(f"Partial failure details from API: {api_response_json.get('failures')}")
                except json.JSONDecodeError:
                     logger.info(f"Successfully sent batch for '{log_source_id}'. Status: {response.status_code}. (Non-JSON response)")
                return True # Batch considered sent even if API reports partial internal failures

            elif 400 <= response.status_code < 500:
                logger.error(f"Client error sending batch for '{log_source_id}': {response.status_code} {response.text[:500]}. Batch will not be retried.")
                return False # Do not retry client errors (4xx)

            # For 5xx server errors or other retryable HTTP errors, raise_for_status() will trigger RequestException
            response.raise_for_status()

        except requests.exceptions.RequestException as e:
            logger.warning(f"Error sending batch for '{log_source_id}' (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2 # Exponential backoff
            else:
                logger.error(f"Failed to send batch for '{log_source_id}' after {max_retries} attempts.")
                return False
    return False


def process_and_send_all_sources(config: configparser.ConfigParser, force_send: bool = False):
    global event_buffer, last_global_flush_time

    now = time.time()
    batch_size = config.getint('DEFAULT', 'BATCH_SIZE', fallback=10)
    flush_interval = config.getfloat('DEFAULT', 'FLUSH_INTERVAL_SECONDS', fallback=5.0)
    api_url = config.get('DEFAULT', 'INGEST_API_URL')

    # This simplified version uses one global buffer.
    # A multi-source agent would typically have per-source buffers or a more complex queue.
    # Here, we assume events in the buffer are already (log_source_id, raw_event) tuples.

    # Check if it's time to flush based on interval or if buffer is full, or if forced
    if event_buffer and (force_send or len(event_buffer) >= batch_size or (now - last_global_flush_time) >= flush_interval):

        # For simplicity, we send the whole buffer. A real agent might group by source_id if buffer contains mixed sources.
        # This example assumes the buffer contains events for ONE source type at a time, or that the send_batch_to_api
        # is called more granularly per source type if buffer stores mixed events.
        # For this PoC, let's assume the buffer contains events that have been tagged with their source_id
        # and we'll group them before sending.

        events_by_source: Dict[str, List[Any]] = {}
        for source_id, event_data in event_buffer:
            events_by_source.setdefault(source_id, []).append(event_data)

        remaining_events_in_buffer: List[Tuple[str, Any]] = []

        for source_id, events_to_send in events_by_source.items():
            # Send in batches for this source_id
            for i in range(0, len(events_to_send), batch_size):
                batch_slice = events_to_send[i:i + batch_size]
                if send_batch_to_api(api_url, source_id, batch_slice, config):
                    logger.info(f"Successfully flushed batch of {len(batch_slice)} events for {source_id}.")
                else:
                    logger.error(f"Failed to flush batch for {source_id}. These events will remain in buffer or be lost if not handled.")
                    # Add un-sent events back to a temporary buffer to be reassigned to global buffer
                    remaining_events_in_buffer.extend([(source_id, event) for event in batch_slice])

        event_buffer = remaining_events_in_buffer # Keep only failed batches
        if not event_buffer: # If all sent (or no failures kept)
            last_global_flush_time = now
    elif not event_buffer: # Buffer is empty, reset timer
        last_global_flush_time = now


# --- Signal Handling & Graceful Exit ---
def handle_exit(signum=None, frame=None):
    global shutdown_flag
    if shutdown_flag: # Avoid multiple calls if signal is received rapidly
        return
    shutdown_flag = True

    logger.info("Shutdown signal received. Attempting to flush remaining events...")
    if agent_config:
        process_and_send_all_sources(agent_config, force_send=True)
    logger.info("Agent shutdown complete.")

# --- Main Loop ---
if __name__ == "__main__":
    agent_config = load_config()
    if not agent_config:
        print("CRITICAL: Agent configuration failed to load. Exiting.")
        exit(1)

    log_level = agent_config.get('DEFAULT', 'AGENT_LOG_LEVEL', fallback='INFO')
    setup_logging(log_level)

    atexit.register(handle_exit)
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    # Store last collection time for each source
    last_collection_times: Dict[str, float] = {}

    logger.info("Event Log Agent started. Press Ctrl+C to exit.")

    try:
        while not shutdown_flag:
            now = time.time()

            # --- Windows Event Log Collection ---
            if agent_config.has_section('WindowsEventLog') and \
               agent_config.getboolean('WindowsEventLog', 'ENABLED', fallback=False):

                win_event_log_source_id = agent_config.get('WindowsEventLog', 'LOG_SOURCE_IDENTIFIER')
                win_interval = agent_config.getfloat('WindowsEventLog', 'COLLECTION_INTERVAL_SECONDS', fallback=60.0)

                if (now - last_collection_times.get(win_event_log_source_id, 0)) >= win_interval:
                    logger.info(f"Collecting Windows events for source: {win_event_log_source_id}")
                    raw_events = collect_windows_events(agent_config['WindowsEventLog'])
                    if raw_events:
                        for event in raw_events:
                            event_buffer.append((win_event_log_source_id, event))
                        logger.info(f"Added {len(raw_events)} Windows events to buffer. Buffer size: {len(event_buffer)}")
                    last_collection_times[win_event_log_source_id] = now

            # --- File Log Collection (Iterate through configured FileLog sections) ---
            for section_name in agent_config.sections():
                if section_name.startswith('FileLog:') and \
                   agent_config.getboolean(section_name, 'ENABLED', fallback=False):

                    file_log_source_id = agent_config.get(section_name, 'LOG_SOURCE_IDENTIFIER')
                    file_path = agent_config.get(section_name, 'FILE_PATH')
                    file_interval = agent_config.getfloat(section_name, 'COLLECTION_INTERVAL_SECONDS', fallback=10.0)

                    if not file_path:
                        logger.warning(f"[{section_name}] FILE_PATH not configured. Skipping.")
                        continue

                    if (now - last_collection_times.get(section_name, 0)) >= file_interval:
                        logger.info(f"Collecting file logs for source: {file_log_source_id} from {file_path}")
                        # For file logs, the raw_event is the line itself or a simple dict.
                        # normalizeEvent in backend expects raw string for syslog_rfc5424
                        raw_log_lines = collect_file_log_lines(file_path, section_name)
                        if raw_log_lines:
                             for line_data in raw_log_lines: # line_data is {"raw_message": ..., "source_file": ...}
                                if file_log_source_id.lower() == 'syslog_rfc5424': # Send raw string for syslog
                                    event_buffer.append((file_log_source_id, line_data["raw_message"]))
                                else: # Send as object for other text/json line logs
                                    event_buffer.append((file_log_source_id, line_data))
                             logger.info(f"Added {len(raw_log_lines)} lines from {file_path} to buffer. Buffer size: {len(event_buffer)}")
                        last_collection_times[section_name] = now

            # --- Process and Send Buffer (handles batch size and flush interval) ---
            process_and_send_all_sources(agent_config)

            time.sleep(1)  # Main loop check interval

    except Exception as e:
        logger.critical(f"Unhandled exception in main loop: {e}", exc_info=True)
    finally:
        logger.info("Agent main loop ended.")
        # Ensure final flush if not caught by atexit/signal (e.g. if loop breaks due to error)
        if not shutdown_flag: # if handle_exit wasn't already called by a signal
             handle_exit()
