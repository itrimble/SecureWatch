// Community Parser Loader
// Loads parsers from community rule repositories (Sigma, OSSEC, Elastic)
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import yaml from 'js-yaml';
export class CommunityParserLoader {
    basePath;
    cacheDir;
    maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
    constructor(basePath = './community-rules') {
        this.basePath = basePath;
        this.cacheDir = path.join(basePath, '.cache');
    }
    // Initialize the loader and create cache directories
    async initialize() {
        try {
            await fs.mkdir(this.basePath, { recursive: true });
            await fs.mkdir(this.cacheDir, { recursive: true });
            // Create subdirectories for different rule types
            await fs.mkdir(path.join(this.basePath, 'sigma'), { recursive: true });
            await fs.mkdir(path.join(this.basePath, 'ossec'), { recursive: true });
            await fs.mkdir(path.join(this.basePath, 'elastic'), { recursive: true });
            logger.info('Community parser loader initialized');
        }
        catch (error) {
            logger.error('Failed to initialize community parser loader:', error);
            throw error;
        }
    }
    // Load Sigma detection rules
    async loadSigmaRules() {
        try {
            logger.info('Loading Sigma detection rules...');
            const sigmaPath = path.join(this.basePath, 'sigma');
            const cacheFile = path.join(this.cacheDir, 'sigma-rules.json');
            // Check if we have cached rules
            const cachedRules = await this.loadFromCache(cacheFile);
            if (cachedRules) {
                logger.info(`Loaded ${cachedRules.length} cached Sigma rules`);
                return cachedRules;
            }
            // Load from files
            const rules = [];
            const files = await this.findYamlFiles(sigmaPath);
            for (const file of files) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const parsed = yaml.load(content);
                    if (this.validateSigmaRule(parsed)) {
                        rules.push(parsed);
                    }
                }
                catch (error) {
                    logger.warn(`Failed to parse Sigma rule ${file}:`, error);
                }
            }
            // Cache the results
            await this.saveToCache(cacheFile, rules);
            logger.info(`Loaded ${rules.length} Sigma rules from ${files.length} files`);
            return rules;
        }
        catch (error) {
            logger.error('Failed to load Sigma rules:', error);
            return [];
        }
    }
    // Load OSSEC detection rules
    async loadOSSECRules() {
        try {
            logger.info('Loading OSSEC detection rules...');
            const ossecPath = path.join(this.basePath, 'ossec');
            const cacheFile = path.join(this.cacheDir, 'ossec-rules.json');
            // Check if we have cached rules
            const cachedRules = await this.loadFromCache(cacheFile);
            if (cachedRules) {
                logger.info(`Loaded ${cachedRules.length} cached OSSEC rules`);
                return cachedRules;
            }
            // Load from XML files
            const rules = [];
            const files = await this.findXmlFiles(ossecPath);
            for (const file of files) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const parsed = await this.parseOSSECXml(content);
                    rules.push(...parsed);
                }
                catch (error) {
                    logger.warn(`Failed to parse OSSEC rules ${file}:`, error);
                }
            }
            // Cache the results
            await this.saveToCache(cacheFile, rules);
            logger.info(`Loaded ${rules.length} OSSEC rules from ${files.length} files`);
            return rules;
        }
        catch (error) {
            logger.error('Failed to load OSSEC rules:', error);
            return [];
        }
    }
    // Load Elastic detection rules
    async loadElasticRules() {
        try {
            logger.info('Loading Elastic detection rules...');
            const elasticPath = path.join(this.basePath, 'elastic');
            const cacheFile = path.join(this.cacheDir, 'elastic-rules.json');
            // Check if we have cached rules
            const cachedRules = await this.loadFromCache(cacheFile);
            if (cachedRules) {
                logger.info(`Loaded ${cachedRules.length} cached Elastic rules`);
                return cachedRules;
            }
            // Load from JSON files
            const rules = [];
            const files = await this.findJsonFiles(elasticPath);
            for (const file of files) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        rules.push(...parsed.filter(this.validateElasticRule));
                    }
                    else if (this.validateElasticRule(parsed)) {
                        rules.push(parsed);
                    }
                }
                catch (error) {
                    logger.warn(`Failed to parse Elastic rules ${file}:`, error);
                }
            }
            // Cache the results
            await this.saveToCache(cacheFile, rules);
            logger.info(`Loaded ${rules.length} Elastic rules from ${files.length} files`);
            return rules;
        }
        catch (error) {
            logger.error('Failed to load Elastic rules:', error);
            return [];
        }
    }
    // Download rules from remote repositories
    async downloadRules() {
        try {
            logger.info('Downloading community rules from remote repositories...');
            // Download Sigma rules
            await this.downloadSigmaRules();
            // Download OSSEC rules
            await this.downloadOSSECRules();
            // Download Elastic rules
            await this.downloadElasticRules();
            logger.info('Community rules download completed');
        }
        catch (error) {
            logger.error('Failed to download community rules:', error);
            throw error;
        }
    }
    // Clear cached rules
    async clearCache() {
        try {
            const files = await fs.readdir(this.cacheDir);
            for (const file of files) {
                await fs.unlink(path.join(this.cacheDir, file));
            }
            logger.info('Community parser cache cleared');
        }
        catch (error) {
            logger.warn('Failed to clear cache:', error);
        }
    }
    // Private helper methods
    async findYamlFiles(dirPath) {
        const files = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    const subFiles = await this.findYamlFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            // Directory doesn't exist or is not readable
        }
        return files;
    }
    async findXmlFiles(dirPath) {
        const files = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    const subFiles = await this.findXmlFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (entry.isFile() && entry.name.endsWith('.xml')) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            // Directory doesn't exist or is not readable
        }
        return files;
    }
    async findJsonFiles(dirPath) {
        const files = [];
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    const subFiles = await this.findJsonFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (entry.isFile() && entry.name.endsWith('.json')) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            // Directory doesn't exist or is not readable
        }
        return files;
    }
    validateSigmaRule(rule) {
        return (typeof rule === 'object' &&
            typeof rule.title === 'string' &&
            typeof rule.description === 'string' &&
            typeof rule.logsource === 'object' &&
            typeof rule.detection === 'object' &&
            typeof rule.detection.condition === 'string');
    }
    validateElasticRule(rule) {
        return (typeof rule === 'object' &&
            typeof rule.name === 'string' &&
            typeof rule.description === 'string' &&
            typeof rule.type === 'string');
    }
    async parseOSSECXml(xmlContent) {
        // Simple XML parsing for OSSEC rules
        // In a production environment, you'd use a proper XML parser
        const rules = [];
        try {
            // Extract rule blocks from XML
            const ruleBlocks = xmlContent.match(/<rule[^>]*>[\s\S]*?<\/rule>/g) || [];
            for (const block of ruleBlocks) {
                const rule = this.parseOSSECRuleBlock(block);
                if (rule) {
                    rules.push(rule);
                }
            }
        }
        catch (error) {
            logger.warn('Failed to parse OSSEC XML:', error);
        }
        return rules;
    }
    parseOSSECRuleBlock(ruleBlock) {
        try {
            // Extract rule attributes
            const idMatch = ruleBlock.match(/id="(\d+)"/);
            const levelMatch = ruleBlock.match(/level="(\d+)"/);
            if (!idMatch || !levelMatch)
                return null;
            // Extract rule content
            const descriptionMatch = ruleBlock.match(/<description>(.*?)<\/description>/s);
            const regexMatch = ruleBlock.match(/<regex>(.*?)<\/regex>/s);
            const matchMatch = ruleBlock.match(/<match>(.*?)<\/match>/s);
            const groupsMatch = ruleBlock.match(/<group>(.*?)<\/group>/s);
            const rule = {
                id: parseInt(idMatch[1], 10),
                level: parseInt(levelMatch[1], 10),
                description: descriptionMatch ? descriptionMatch[1].trim() : 'No description',
                regex: regexMatch ? regexMatch[1].trim() : undefined,
                match: matchMatch ? matchMatch[1].trim() : undefined,
                groups: groupsMatch ? groupsMatch[1].split(',').map(g => g.trim()) : undefined
            };
            return rule;
        }
        catch (error) {
            return null;
        }
    }
    async loadFromCache(cacheFile) {
        try {
            const stats = await fs.stat(cacheFile);
            const age = Date.now() - stats.mtime.getTime();
            if (age > this.maxCacheAge) {
                return null; // Cache expired
            }
            const content = await fs.readFile(cacheFile, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            return null; // Cache doesn't exist or is corrupted
        }
    }
    async saveToCache(cacheFile, data) {
        try {
            await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
        }
        catch (error) {
            logger.warn(`Failed to save cache ${cacheFile}:`, error);
        }
    }
    async downloadSigmaRules() {
        // In a real implementation, you would:
        // 1. Clone or download from https://github.com/SigmaHQ/sigma
        // 2. Extract relevant rules
        // 3. Save to the sigma directory
        logger.info('Sigma rules download would be implemented here');
        // Create sample rules for demonstration
        const sampleSigmaRule = {
            title: 'Suspicious PowerShell Execution',
            description: 'Detects suspicious PowerShell command execution',
            author: 'SecureWatch',
            level: 'medium',
            logsource: {
                category: 'process_creation',
                product: 'windows'
            },
            detection: {
                selection: {
                    Image: '*\\powershell.exe',
                    CommandLine: '*-ExecutionPolicy*Bypass*'
                },
                condition: 'selection'
            },
            tags: ['attack.execution', 'attack.t1059.001']
        };
        const sigmaPath = path.join(this.basePath, 'sigma', 'sample-rules.yml');
        await fs.writeFile(sigmaPath, yaml.dump(sampleSigmaRule));
    }
    async downloadOSSECRules() {
        // In a real implementation, you would:
        // 1. Download from OSSEC/Wazuh rule repositories
        // 2. Parse and save rules
        logger.info('OSSEC rules download would be implemented here');
        // Create sample rules for demonstration
        const sampleOSSECRules = `
    <group name="syslog,">
      <rule id="1001" level="2">
        <description>Generic template for all syslog rules.</description>
      </rule>
      
      <rule id="5500" level="5">
        <if_sid>1001</if_sid>
        <match>session opened for user</match>
        <description>User login.</description>
        <group>authentication_success</group>
      </rule>
    </group>
    `;
        const ossecPath = path.join(this.basePath, 'ossec', 'sample-rules.xml');
        await fs.writeFile(ossecPath, sampleOSSECRules);
    }
    async downloadElasticRules() {
        // In a real implementation, you would:
        // 1. Download from https://github.com/elastic/detection-rules
        // 2. Parse and save rules
        logger.info('Elastic rules download would be implemented here');
        // Create sample rules for demonstration
        const sampleElasticRule = {
            name: 'Suspicious Process Execution',
            description: 'Detects suspicious process execution patterns',
            type: 'query',
            language: 'kuery',
            query: 'process.name:powershell.exe and process.command_line:*bypass*',
            risk_score: 75,
            severity: 'high',
            threat: [{
                    framework: 'MITRE ATT&CK',
                    tactic: {
                        id: 'TA0002',
                        name: 'Execution',
                        reference: 'https://attack.mitre.org/tactics/TA0002/'
                    },
                    technique: [{
                            id: 'T1059.001',
                            name: 'PowerShell',
                            reference: 'https://attack.mitre.org/techniques/T1059/001/'
                        }]
                }],
            author: ['SecureWatch'],
            version: 1,
            tags: ['Domain: Endpoint', 'OS: Windows', 'Use Case: Threat Detection']
        };
        const elasticPath = path.join(this.basePath, 'elastic', 'sample-rules.json');
        await fs.writeFile(elasticPath, JSON.stringify([sampleElasticRule], null, 2));
    }
}
//# sourceMappingURL=CommunityParserLoader.js.map