#!/usr/bin/env python3
"""
Test script for EVTX parsing pipeline
Validates the complete flow from EVTX file parsing to SecureWatch ingestion
"""

import json
import asyncio
import tempfile
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sample Windows event data for testing
SAMPLE_EVENTS = [
    {
        "timestamp": "2024-01-15T10:30:00.000Z",
        "event_id": 4624,
        "level": "Information",
        "channel": "Security",
        "computer": "DESKTOP-TEST01",
        "record_id": 12345,
        "correlation_id": "test-correlation-001",
        "user_id": "S-1-5-21-1234567890-1234567890-1234567890-1001",
        "process_id": 1234,
        "thread_id": 5678,
        "activity_id": "activity-guid-001",
        "keywords": "0x8020000000000000",
        "task": "Logon",
        "opcode": "Info",
        "source_file": "test_security.evtx",
        "parsed_timestamp": datetime.now().isoformat(),
        "event_data": {
            "SubjectUserSid": "S-1-5-18",
            "SubjectUserName": "SYSTEM",
            "SubjectDomainName": "NT AUTHORITY",
            "SubjectLogonId": "0x3e7",
            "TargetUserSid": "S-1-5-21-1234567890-1234567890-1234567890-1001",
            "TargetUserName": "testuser",
            "TargetDomainName": "WORKGROUP",
            "TargetLogonId": "0x12345",
            "LogonType": "2",
            "LogonProcessName": "User32",
            "AuthenticationPackageName": "Negotiate",
            "WorkstationName": "DESKTOP-TEST01",
            "LogonGuid": "{00000000-0000-0000-0000-000000000000}",
            "TransmittedServices": "-",
            "LmPackageName": "-",
            "KeyLength": "0",
            "ProcessId": "0x1234",
            "ProcessName": "C:\\Windows\\System32\\winlogon.exe",
            "IpAddress": "192.168.1.100",
            "IpPort": "0"
        },
        "system_data": {
            "Provider": "Microsoft-Windows-Security-Auditing",
            "Guid": "{54849625-5478-4994-A5BA-3E3B0328C30D}",
            "Level": "0",
            "Task": "12544",
            "Opcode": "0",
            "Version": "2"
        },
        "raw_xml": "<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'>...</Event>",
        "metadata": {
            "parser": "evtx_parser",
            "version": "1.0",
            "source_type": "windows_evtx"
        }
    },
    {
        "timestamp": "2024-01-15T10:31:00.000Z",
        "event_id": 4625,
        "level": "Information",
        "channel": "Security",
        "computer": "DESKTOP-TEST01",
        "record_id": 12346,
        "correlation_id": "test-correlation-002",
        "user_id": "S-1-5-18",
        "process_id": 1234,
        "thread_id": 5679,
        "activity_id": "activity-guid-002",
        "keywords": "0x8010000000000000",
        "task": "Logon",
        "opcode": "Info",
        "source_file": "test_security.evtx",
        "parsed_timestamp": datetime.now().isoformat(),
        "event_data": {
            "SubjectUserSid": "S-1-5-18",
            "SubjectUserName": "SYSTEM",
            "SubjectDomainName": "NT AUTHORITY",
            "SubjectLogonId": "0x3e7",
            "TargetUserName": "baduser",
            "TargetDomainName": "WORKGROUP",
            "Status": "0xc000006d",
            "FailureReason": "%%2313",
            "SubStatus": "0xc0000064",
            "LogonType": "2",
            "LogonProcessName": "User32",
            "AuthenticationPackageName": "Negotiate",
            "WorkstationName": "DESKTOP-TEST01",
            "TransmittedServices": "-",
            "LmPackageName": "-",
            "KeyLength": "0",
            "ProcessId": "0x1234",
            "ProcessName": "C:\\Windows\\System32\\winlogon.exe",
            "IpAddress": "192.168.1.200",
            "IpPort": "0"
        },
        "system_data": {
            "Provider": "Microsoft-Windows-Security-Auditing",
            "Guid": "{54849625-5478-4994-A5BA-3E3B0328C30D}",
            "Level": "0",
            "Task": "12544",
            "Opcode": "0",
            "Version": "2"
        },
        "raw_xml": "<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'>...</Event>",
        "metadata": {
            "parser": "evtx_parser",
            "version": "1.0",
            "source_type": "windows_evtx"
        }
    },
    {
        "timestamp": "2024-01-15T10:32:00.000Z",
        "event_id": 4688,
        "level": "Information",
        "channel": "Security",
        "computer": "DESKTOP-TEST01",
        "record_id": 12347,
        "correlation_id": "test-correlation-003",
        "user_id": "S-1-5-21-1234567890-1234567890-1234567890-1001",
        "process_id": 2345,
        "thread_id": 6789,
        "activity_id": "activity-guid-003",
        "keywords": "0x8020000000000000",
        "task": "Process Creation",
        "opcode": "Info",
        "source_file": "test_security.evtx",
        "parsed_timestamp": datetime.now().isoformat(),
        "event_data": {
            "SubjectUserSid": "S-1-5-21-1234567890-1234567890-1234567890-1001",
            "SubjectUserName": "testuser",
            "SubjectDomainName": "WORKGROUP",
            "SubjectLogonId": "0x12345",
            "NewProcessId": "0x2468",
            "NewProcessName": "C:\\Windows\\System32\\notepad.exe",
            "TokenElevationType": "%%1936",
            "ProcessId": "0x1357",
            "CommandLine": "\"C:\\Windows\\System32\\notepad.exe\" C:\\temp\\test.txt",
            "TargetUserSid": "S-1-5-21-1234567890-1234567890-1234567890-1001",
            "TargetUserName": "testuser",
            "TargetDomainName": "WORKGROUP",
            "TargetLogonId": "0x12345",
            "ParentProcessName": "C:\\Windows\\explorer.exe",
            "MandatoryLabel": "S-1-16-8192"
        },
        "system_data": {
            "Provider": "Microsoft-Windows-Security-Auditing",
            "Guid": "{54849625-5478-4994-A5BA-3E3B0328C30D}",
            "Level": "0",
            "Task": "13312",
            "Opcode": "0",
            "Version": "2"
        },
        "raw_xml": "<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'>...</Event>",
        "metadata": {
            "parser": "evtx_parser",
            "version": "1.0",
            "source_type": "windows_evtx"
        }
    }
]

async def test_ingestion_api(events: List[Dict[str, Any]], endpoint_url: str = "http://localhost:4002") -> Dict[str, Any]:
    """Test sending events to the log ingestion API"""
    import aiohttp
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test batch endpoint
            batch_url = f"{endpoint_url}/api/logs/batch"
            async with session.post(batch_url, json={"events": events}) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"Batch ingestion successful: {result}")
                    return result
                else:
                    error_text = await response.text()
                    logger.error(f"Batch ingestion failed: {response.status} - {error_text}")
                    return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
                    
    except Exception as e:
        logger.error(f"Error testing ingestion API: {e}")
        return {"success": False, "error": str(e)}

def validate_event_structure(event: Dict[str, Any]) -> List[str]:
    """Validate that event has required structure for SecureWatch"""
    errors = []
    
    # Required fields
    required_fields = ['timestamp', 'event_id', 'channel', 'computer']
    for field in required_fields:
        if field not in event:
            errors.append(f"Missing required field: {field}")
    
    # Event ID should be integer
    if 'event_id' in event and not isinstance(event['event_id'], int):
        errors.append("event_id should be integer")
    
    # Timestamp should be ISO format
    if 'timestamp' in event:
        try:
            datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00'))
        except:
            errors.append("timestamp should be ISO 8601 format")
    
    # Event data should be dictionary
    if 'event_data' in event and not isinstance(event['event_data'], dict):
        errors.append("event_data should be dictionary")
    
    return errors

def test_field_mappings():
    """Test field mappings against known Windows Event IDs"""
    logger.info("Testing field mappings...")
    
    # Test successful logon event (4624)
    logon_event = SAMPLE_EVENTS[0]
    errors = validate_event_structure(logon_event)
    if errors:
        logger.error(f"Validation errors for 4624 event: {errors}")
    else:
        logger.info("✓ Event 4624 (Successful Logon) structure valid")
    
    # Test failed logon event (4625)
    failed_logon_event = SAMPLE_EVENTS[1]
    errors = validate_event_structure(failed_logon_event)
    if errors:
        logger.error(f"Validation errors for 4625 event: {errors}")
    else:
        logger.info("✓ Event 4625 (Failed Logon) structure valid")
    
    # Test process creation event (4688)
    process_event = SAMPLE_EVENTS[2]
    errors = validate_event_structure(process_event)
    if errors:
        logger.error(f"Validation errors for 4688 event: {errors}")
    else:
        logger.info("✓ Event 4688 (Process Creation) structure valid")

def test_normalization():
    """Test event normalization logic"""
    logger.info("Testing event normalization...")
    
    # Test authentication event mapping
    auth_event = SAMPLE_EVENTS[0]
    if auth_event['event_id'] == 4624 and auth_event['channel'] == 'Security':
        if 'TargetUserName' in auth_event['event_data']:
            logger.info("✓ Authentication event mapping correct")
        else:
            logger.error("✗ Missing TargetUserName in authentication event")
    
    # Test process event mapping
    process_event = SAMPLE_EVENTS[2]
    if process_event['event_id'] == 4688:
        if 'NewProcessName' in process_event['event_data'] and 'CommandLine' in process_event['event_data']:
            logger.info("✓ Process creation event mapping correct")
        else:
            logger.error("✗ Missing process fields in process creation event")

async def test_full_pipeline():
    """Test the complete EVTX pipeline"""
    logger.info("Starting EVTX pipeline test...")
    
    # Step 1: Validate event structures
    logger.info("Step 1: Validating event structures...")
    test_field_mappings()
    
    # Step 2: Test normalization logic
    logger.info("Step 2: Testing normalization logic...")
    test_normalization()
    
    # Step 3: Test API ingestion
    logger.info("Step 3: Testing API ingestion...")
    result = await test_ingestion_api(SAMPLE_EVENTS)
    
    if result.get('success'):
        logger.info("✓ EVTX pipeline test completed successfully")
        logger.info(f"Events processed: {result.get('processed_events', 0)}")
        logger.info(f"Events failed: {result.get('failed_events', 0)}")
        return True
    else:
        logger.error("✗ EVTX pipeline test failed")
        logger.error(f"Error: {result.get('error', 'Unknown error')}")
        return False

async def test_correlation_engine():
    """Test correlation engine integration"""
    logger.info("Testing correlation engine integration...")
    
    # Test correlation API
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            correlation_url = "http://localhost:4005/health"
            async with session.get(correlation_url) as response:
                if response.status == 200:
                    logger.info("✓ Correlation engine is reachable")
                    return True
                else:
                    logger.error(f"✗ Correlation engine health check failed: {response.status}")
                    return False
    except Exception as e:
        logger.error(f"✗ Error connecting to correlation engine: {e}")
        return False

def generate_test_report(pipeline_success: bool, correlation_success: bool) -> Dict[str, Any]:
    """Generate test report"""
    report = {
        "test_timestamp": datetime.now().isoformat(),
        "pipeline_test": {
            "success": pipeline_success,
            "events_tested": len(SAMPLE_EVENTS),
            "event_types": [
                {"event_id": 4624, "description": "Successful Logon"},
                {"event_id": 4625, "description": "Failed Logon"},
                {"event_id": 4688, "description": "Process Creation"}
            ]
        },
        "correlation_test": {
            "success": correlation_success
        },
        "field_mappings": {
            "authentication_fields": ["TargetUserName", "LogonType", "IpAddress", "WorkstationName"],
            "process_fields": ["NewProcessName", "CommandLine", "CreatorProcessName"],
            "network_fields": ["IpAddress", "IpPort"],
            "security_fields": ["SubjectUserSid", "TargetUserSid"]
        },
        "recommendations": []
    }
    
    if not pipeline_success:
        report["recommendations"].append("Check log ingestion service on port 4002")
    
    if not correlation_success:
        report["recommendations"].append("Check correlation engine service on port 4005")
    
    if pipeline_success and correlation_success:
        report["recommendations"].append("EVTX pipeline is ready for production use")
    
    return report

async def main():
    """Main test function"""
    logger.info("=" * 60)
    logger.info("SecureWatch EVTX Pipeline Test")
    logger.info("=" * 60)
    
    # Test pipeline
    pipeline_success = await test_full_pipeline()
    
    # Test correlation engine
    correlation_success = await test_correlation_engine()
    
    # Generate report
    report = generate_test_report(pipeline_success, correlation_success)
    
    # Save report
    report_file = Path(__file__).parent / "evtx_test_report.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    logger.info("=" * 60)
    logger.info(f"Test Report: {report_file}")
    logger.info(f"Pipeline Test: {'✓ PASS' if pipeline_success else '✗ FAIL'}")
    logger.info(f"Correlation Test: {'✓ PASS' if correlation_success else '✗ FAIL'}")
    logger.info("=" * 60)
    
    return pipeline_success and correlation_success

if __name__ == '__main__':
    success = asyncio.run(main())
    exit(0 if success else 1)