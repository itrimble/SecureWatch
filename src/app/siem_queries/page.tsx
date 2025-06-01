import React from 'react';

const SiemQueriesPage: React.FC = () => {
  const eventQueries = [
    {
      id: "4624",
      description: "Successful Account Logon",
      splunk: "index=wineventlog sourcetype=WinEventLog EventCode=4624",
      splunk_note: "Assumes 'wineventlog' index and 'WinEventLog' sourcetype. EventCode field holds the Windows Event ID.",
      sentinel: "SecurityEvent\n| where EventID == 4624",
      sentinel_note: "Assumes logs are in the 'SecurityEvent' table.",
      chronicle: 'metadata.event_type = "USER_LOGIN" AND security_result.action = "ALLOW"\n// To specifically filter by product event ID, if available and parsed:\n// AND metadata.product_event_type = "4624"',
      chronicle_note: "UDM mapping can vary. `metadata.product_event_type` often stores the original Event ID. Check your parser configuration.",
      qradar: "SELECT * FROM events WHERE \"Event ID\" = '4624' AND LOGSOURCETYPENAME(devicetype) = 'Microsoft Windows Security Event Log'",
      qradar_note: "QRadar often uses QIDs. A QID-based query for 'User Logon Success' might also be used. Field name for event ID can vary.",
    },
    {
      id: "4625",
      description: "Failed Account Logon",
      splunk: "index=wineventlog sourcetype=WinEventLog EventCode=4625",
      sentinel: "SecurityEvent\n| where EventID == 4625",
      chronicle: 'metadata.event_type = "USER_LOGIN" AND security_result.action = "FAIL"\n// AND metadata.product_event_type = "4625"',
      chronicle_note: "UDM mapping can vary. `metadata.product_event_type` often stores the original Event ID.",
      qradar: "SELECT * FROM events WHERE \"Event ID\" = '4625' AND LOGSOURCETYPENAME(devicetype) = 'Microsoft Windows Security Event Log'",
      qradar_note: "QID-based query for 'User Logon Failure' is also common.",
    },
    {
      id: "4688",
      description: "A new process has been created",
      splunk: "index=wineventlog sourcetype=WinEventLog EventCode=4688",
      sentinel: "SecurityEvent\n| where EventID == 4688\n// Or for specific process name:\n// SecurityEvent\n// | where EventID == 4688 and NewProcessName has \"powershell.exe\"",
      chronicle: 'metadata.event_type = "PROCESS_LAUNCH"\n// AND principal.process.file.full_path = "C:\\\\Windows\\\\System32\\\\svchost.exe"\n// AND metadata.product_event_type = "4688"',
      chronicle_note: "UDM: `principal.process.file.full_path` for process path. `metadata.product_event_type` for original ID.",
      qradar: "SELECT * FROM events WHERE \"Event ID\" = '4688' AND LOGSOURCETYPENAME(devicetype) = 'Microsoft Windows Security Event Log'",
      qradar_note: "QID for 'Process Creation' often used. Fields like 'Process Name' or 'Command Line' can be added.",
    },
    {
      id: "1102",
      description: "The audit log was cleared",
      splunk: "index=wineventlog sourcetype=WinEventLog EventCode=1102",
      sentinel: "SecurityEvent\n| where EventID == 1102",
      chronicle: 'metadata.event_type = "SYSTEM_AUDIT_LOG_WIPE"\n// AND metadata.product_event_type = "1102"',
      chronicle_note: "UDM type `SYSTEM_AUDIT_LOG_WIPE` is specific. `metadata.product_event_type` for original ID.",
      qradar: "SELECT * FROM events WHERE \"Event ID\" = '1102' AND LOGSOURCETYPENAME(devicetype) = 'Microsoft Windows Security Event Log'",
      qradar_note: "QID for 'Audit Log Cleared' is common.",
    },
    {
      id: "4720",
      description: "A user account was created",
      splunk: "index=wineventlog sourcetype=WinEventLog EventCode=4720",
      sentinel: "SecurityEvent\n| where EventID == 4720",
      chronicle: 'metadata.event_type = "USER_CREATION"\n// AND metadata.product_event_type = "4720"',
      chronicle_note: "UDM type `USER_CREATION`. `metadata.product_event_type` for original ID.",
      qradar: "SELECT * FROM events WHERE \"Event ID\" = '4720' AND LOGSOURCETYPENAME(devicetype) = 'Microsoft Windows Security Event Log'",
      qradar_note: "QID for 'User Account Created' is common.",
    },
    {
      id: "4732",
      description: "A member was added to a security-enabled local group",
      splunk: "index=wineventlog sourcetype=WinEventLog EventCode=4732",
      sentinel: "SecurityEvent\n| where EventID == 4732",
      chronicle: 'metadata.event_type = "GROUP_MEMBER_ADDED"\n// AND target.group.type = "LOCAL_GROUP"\n// AND metadata.product_event_type = "4732"',
      chronicle_note: "UDM type `GROUP_MEMBER_ADDED`. `metadata.product_event_type` for original ID. Group type may need to be specified.",
      qradar: "SELECT * FROM events WHERE \"Event ID\" = '4732' AND LOGSOURCETYPENAME(devicetype) = 'Microsoft Windows Security Event Log'",
      qradar_note: "QID for 'User Added to Local Group' is common.",
    },
    {
      id: "4698",
      description: "A scheduled task was created",
      splunk: "index=wineventlog sourcetype=WinEventLog EventCode=4698",
      sentinel: "SecurityEvent\n| where EventID == 4698",
      chronicle: 'metadata.event_type = "SCHEDULED_TASK_CREATION"\n// AND metadata.product_event_type = "4698"',
      chronicle_note: "UDM type `SCHEDULED_TASK_CREATION`. `metadata.product_event_type` for original ID.",
      qradar: "SELECT * FROM events WHERE \"Event ID\" = '4698' AND LOGSOURCETYPENAME(devicetype) = 'Microsoft Windows Security Event Log'",
      qradar_note: "QID for 'Scheduled Task Created' is common.",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 text-gray-100">
      <h1 className="text-3xl font-bold mb-8 border-b border-gray-600 pb-4">SIEM Query Reference</h1>
      <p className="mb-10 text-gray-300">
        This page provides basic query examples for common Windows Event IDs across various SIEM platforms. 
        Note that specific field names, index names, and sourcetypes might vary based on your SIEM configuration and parsing setup. 
        Always adapt these queries to your environment.
      </p>

      <div className="space-y-12">
        {eventQueries.map((event) => (
          <section key={event.id} className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-1 text-blue-400">Event ID {event.id}</h2>
            <p className="text-lg text-gray-300 mb-6">{event.description}</p>

            <div className="space-y-6">
              {/* Splunk */}
              <div>
                <h3 className="text-xl font-medium text-gray-200 mb-2">Splunk</h3>
                <pre className="bg-gray-900 p-4 rounded-md text-sm text-green-400 overflow-x-auto">
                  <code>{event.splunk}</code>
                </pre>
                {event.splunk_note && <p className="text-xs text-gray-400 mt-2 italic">{event.splunk_note}</p>}
              </div>

              {/* Microsoft Sentinel */}
              <div>
                <h3 className="text-xl font-medium text-gray-200 mb-2">Microsoft Sentinel (KQL)</h3>
                <pre className="bg-gray-900 p-4 rounded-md text-sm text-green-400 overflow-x-auto">
                  <code>{event.sentinel}</code>
                </pre>
                {event.sentinel_note && <p className="text-xs text-gray-400 mt-2 italic">{event.sentinel_note}</p>}
              </div>

              {/* Google Security Operations (Chronicle) */}
              <div>
                <h3 className="text-xl font-medium text-gray-200 mb-2">Google Security Operations (Chronicle UDM/YARA-L)</h3>
                <pre className="bg-gray-900 p-4 rounded-md text-sm text-green-400 overflow-x-auto">
                  <code>{event.chronicle}</code>
                </pre>
                {event.chronicle_note && <p className="text-xs text-gray-400 mt-2 italic">{event.chronicle_note}</p>}
              </div>

              {/* IBM QRadar */}
              <div>
                <h3 className="text-xl font-medium text-gray-200 mb-2">IBM QRadar (AQL)</h3>
                <pre className="bg-gray-900 p-4 rounded-md text-sm text-green-400 overflow-x-auto">
                  <code>{event.qradar}</code>
                </pre>
                {event.qradar_note && <p className="text-xs text-gray-400 mt-2 italic">{event.qradar_note}</p>}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default SiemQueriesPage;
