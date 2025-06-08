export var LogSource;
(function (LogSource) {
    LogSource["WINDOWS_EVENT_LOG"] = "windows_event_log";
    LogSource["SYSLOG"] = "syslog";
    LogSource["AWS_CLOUDTRAIL"] = "aws_cloudtrail";
    LogSource["AZURE_ACTIVITY"] = "azure_activity";
    LogSource["GCP_LOGGING"] = "gcp_logging";
    LogSource["OFFICE365"] = "office365";
    LogSource["FIREWALL"] = "firewall";
    LogSource["IDS_IPS"] = "ids_ips";
    LogSource["ENDPOINT"] = "endpoint";
    LogSource["APPLICATION"] = "application";
    LogSource["CSV"] = "csv";
    LogSource["XML"] = "xml";
    LogSource["JSON"] = "json";
    LogSource["CUSTOM"] = "custom";
})(LogSource || (LogSource = {}));
export var LogSeverity;
(function (LogSeverity) {
    LogSeverity["CRITICAL"] = "critical";
    LogSeverity["HIGH"] = "high";
    LogSeverity["MEDIUM"] = "medium";
    LogSeverity["LOW"] = "low";
    LogSeverity["INFO"] = "info";
    LogSeverity["DEBUG"] = "debug";
})(LogSeverity || (LogSeverity = {}));
export var LogCategory;
(function (LogCategory) {
    LogCategory["AUTHENTICATION"] = "authentication";
    LogCategory["AUTHORIZATION"] = "authorization";
    LogCategory["SYSTEM"] = "system";
    LogCategory["APPLICATION"] = "application";
    LogCategory["SECURITY"] = "security";
    LogCategory["NETWORK"] = "network";
    LogCategory["FILE"] = "file";
    LogCategory["PROCESS"] = "process";
    LogCategory["REGISTRY"] = "registry";
    LogCategory["AUDIT"] = "audit";
    LogCategory["THREAT"] = "threat";
    LogCategory["COMPLIANCE"] = "compliance";
})(LogCategory || (LogCategory = {}));
//# sourceMappingURL=log-event.types.js.map