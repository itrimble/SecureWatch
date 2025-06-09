// Pluggable parsing engine with regex-based parsers

use crate::collectors::RawLogEvent;
use crate::config::{ParsersConfig, ParserDefinition};
use crate::errors::ParserError;
use async_trait::async_trait;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{debug, warn, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedEvent {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub source: String,
    pub level: Option<String>,
    pub message: String,
    pub fields: HashMap<String, serde_json::Value>,
    pub raw_data: String,
    pub parser_name: String,
}

#[async_trait]
pub trait Parser: Send + Sync {
    async fn parse(&self, raw_event: &RawLogEvent) -> Result<ParsedEvent, ParserError>;
    fn name(&self) -> &str;
    fn source_type(&self) -> &str;
    fn can_parse(&self, raw_event: &RawLogEvent) -> bool;
}

pub struct RegexParser {
    name: String,
    source_type: String,
    regex: Regex,
    field_mappings: HashMap<String, String>,
}

impl RegexParser {
    pub fn new(definition: &ParserDefinition) -> Result<Self, ParserError> {
        let regex = Regex::new(&definition.regex_pattern)
            .map_err(|e| ParserError::invalid_regex(&format!("Invalid regex pattern '{}': {}", definition.regex_pattern, e)))?;
            
        Ok(Self {
            name: definition.name.clone(),
            source_type: definition.source_type.clone(),
            regex,
            field_mappings: definition.field_mappings.clone(),
        })
    }
    
    fn extract_fields(&self, text: &str) -> Result<HashMap<String, serde_json::Value>, ParserError> {
        let mut fields = HashMap::new();
        
        if let Some(captures) = self.regex.captures(text) {
            for (field_name, mapped_name) in &self.field_mappings {
                if let Some(captured_value) = captures.name(field_name) {
                    let value_str = captured_value.as_str();
                    
                    // Try to parse as different types
                    let json_value = if let Ok(num) = value_str.parse::<i64>() {
                        serde_json::Value::Number(serde_json::Number::from(num))
                    } else if let Ok(float) = value_str.parse::<f64>() {
                        if let Some(num) = serde_json::Number::from_f64(float) {
                            serde_json::Value::Number(num)
                        } else {
                            serde_json::Value::String(value_str.to_string())
                        }
                    } else if value_str.eq_ignore_ascii_case("true") || value_str.eq_ignore_ascii_case("false") {
                        serde_json::Value::Bool(value_str.eq_ignore_ascii_case("true"))
                    } else {
                        serde_json::Value::String(value_str.to_string())
                    };
                    
                    fields.insert(mapped_name.clone(), json_value);
                }
            }
        } else {
            return Err(ParserError::parse_failed(&format!("Regex pattern did not match: {}", text)));
        }
        
        Ok(fields)
    }
}

#[async_trait]
impl Parser for RegexParser {
    async fn parse(&self, raw_event: &RawLogEvent) -> Result<ParsedEvent, ParserError> {
        debug!("🔍 Parsing event with '{}' parser", self.name);
        
        let fields = self.extract_fields(&raw_event.raw_data)?;
        
        // Extract common fields
        let level = fields.get("level")
            .or_else(|| fields.get("severity"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
            
        let message = fields.get("message")
            .or_else(|| fields.get("msg"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| raw_event.raw_data.clone());
        
        let parsed_event = ParsedEvent {
            timestamp: raw_event.timestamp,
            source: raw_event.source.clone(),
            level,
            message,
            fields,
            raw_data: raw_event.raw_data.clone(),
            parser_name: self.name.clone(),
        };
        
        debug!("✅ Successfully parsed event with {} fields", parsed_event.fields.len());
        Ok(parsed_event)
    }
    
    fn name(&self) -> &str {
        &self.name
    }
    
    fn source_type(&self) -> &str {
        &self.source_type
    }
    
    fn can_parse(&self, raw_event: &RawLogEvent) -> bool {
        raw_event.source == self.source_type && self.regex.is_match(&raw_event.raw_data)
    }
}

pub struct PassthroughParser {
    name: String,
    source_type: String,
}

impl PassthroughParser {
    pub fn new(source_type: String) -> Self {
        Self {
            name: format!("passthrough_{}", source_type),
            source_type,
        }
    }
}

#[async_trait]
impl Parser for PassthroughParser {
    async fn parse(&self, raw_event: &RawLogEvent) -> Result<ParsedEvent, ParserError> {
        debug!("📤 Using passthrough parser for '{}'", self.source_type);
        
        Ok(ParsedEvent {
            timestamp: raw_event.timestamp,
            source: raw_event.source.clone(),
            level: None,
            message: raw_event.raw_data.clone(),
            fields: HashMap::new(),
            raw_data: raw_event.raw_data.clone(),
            parser_name: self.name.clone(),
        })
    }
    
    fn name(&self) -> &str {
        &self.name
    }
    
    fn source_type(&self) -> &str {
        &self.source_type
    }
    
    fn can_parse(&self, raw_event: &RawLogEvent) -> bool {
        raw_event.source == self.source_type
    }
}

pub struct ParsingEngine {
    parsers: Vec<Box<dyn Parser>>,
    fallback_parsers: HashMap<String, Box<dyn Parser>>,
}

impl ParsingEngine {
    pub fn new(config: &ParsersConfig) -> Result<Self, ParserError> {
        let mut parsers: Vec<Box<dyn Parser>> = Vec::new();
        let mut fallback_parsers = HashMap::new();
        
        // Create regex parsers from configuration
        for parser_def in &config.parsers {
            match RegexParser::new(parser_def) {
                Ok(parser) => {
                    debug!("📋 Loaded parser: {} for source type: {}", parser.name(), parser.source_type());
                    parsers.push(Box::new(parser));
                }
                Err(e) => {
                    error!("❌ Failed to create parser '{}': {}", parser_def.name, e);
                    return Err(e);
                }
            }
        }
        
        // Create fallback passthrough parsers for common source types
        let common_sources = vec!["syslog", "file_monitor", "windows_event"];
        for source in common_sources {
            fallback_parsers.insert(
                source.to_string(),
                Box::new(PassthroughParser::new(source.to_string())) as Box<dyn Parser>
            );
        }
        
        Ok(Self {
            parsers,
            fallback_parsers,
        })
    }
    
    pub async fn parse_event(&self, raw_event: &RawLogEvent) -> Result<ParsedEvent, ParserError> {
        // Try to find a matching parser
        for parser in &self.parsers {
            if parser.can_parse(raw_event) {
                match parser.parse(raw_event).await {
                    Ok(parsed_event) => {
                        debug!("✅ Event parsed successfully by '{}'", parser.name());
                        return Ok(parsed_event);
                    }
                    Err(e) => {
                        warn!("⚠️  Parser '{}' failed to parse event: {}", parser.name(), e);
                        // Continue to try other parsers
                    }
                }
            }
        }
        
        // If no specific parser worked, try fallback parser
        if let Some(fallback_parser) = self.fallback_parsers.get(&raw_event.source) {
            debug!("🔄 Using fallback parser for source: {}", raw_event.source);
            return fallback_parser.parse(raw_event).await;
        }
        
        // If all else fails, return an error
        Err(ParserError::NoMatchingParser {
            source_type: raw_event.source.clone(),
            available_parsers: self.parsers.iter().map(|p| p.name().to_string()).collect(),
            suggested_parser: None,
        })
    }
    
    pub fn get_parser_stats(&self) -> Vec<ParserStats> {
        let mut stats = Vec::new();
        
        for parser in &self.parsers {
            stats.push(ParserStats {
                name: parser.name().to_string(),
                source_type: parser.source_type().to_string(),
                parser_type: "regex".to_string(),
            });
        }
        
        for (source, parser) in &self.fallback_parsers {
            stats.push(ParserStats {
                name: parser.name().to_string(),
                source_type: source.clone(),
                parser_type: "passthrough".to_string(),
            });
        }
        
        stats
    }
    
    pub async fn reload_parsers(&mut self, config: &ParsersConfig) -> Result<(), ParserError> {
        debug!("🔄 Reloading parsers from configuration");
        
        // Clear existing parsers
        self.parsers.clear();
        
        // Reload from configuration
        for parser_def in &config.parsers {
            match RegexParser::new(parser_def) {
                Ok(parser) => {
                    debug!("📋 Reloaded parser: {} for source type: {}", parser.name(), parser.source_type());
                    self.parsers.push(Box::new(parser));
                }
                Err(e) => {
                    error!("❌ Failed to reload parser '{}': {}", parser_def.name, e);
                    return Err(e);
                }
            }
        }
        
        debug!("✅ Successfully reloaded {} parsers", self.parsers.len());
        Ok(())
    }
}

#[derive(Debug, Serialize)]
pub struct ParserStats {
    pub name: String,
    pub source_type: String,
    pub parser_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[tokio::test]
    async fn test_regex_parser() {
        let definition = ParserDefinition {
            name: "test_parser".to_string(),
            source_type: "test".to_string(),
            regex_pattern: r"^(?P<level>\w+): (?P<message>.*)$".to_string(),
            field_mappings: HashMap::from([
                ("level".to_string(), "log.level".to_string()),
                ("message".to_string(), "message".to_string()),
            ]),
        };
        
        let parser = RegexParser::new(&definition).unwrap();
        
        let raw_event = RawLogEvent {
            timestamp: Utc::now(),
            source: "test".to_string(),
            raw_data: "INFO: This is a test message".to_string(),
            metadata: HashMap::new(),
        };
        
        let result = parser.parse(&raw_event).await;
        assert!(result.is_ok());
        
        let parsed = result.unwrap();
        assert_eq!(parsed.parser_name, "test_parser");
        assert!(parsed.fields.contains_key("log.level"));
        assert!(parsed.fields.contains_key("message"));
    }
}