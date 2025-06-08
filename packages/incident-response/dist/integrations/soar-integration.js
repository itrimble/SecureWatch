"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOARIntegrationService = void 0;
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class PhantomConnector {
    constructor(config) {
        this.connected = false;
        this.config = config;
    }
    async connect() {
        try {
            const response = await axios_1.default.post(`${this.config.endpoint}/rest/ph_user/login`, {
                username: this.config.config.username,
                password: this.config.config.password
            });
            this.sessionToken = response.data.session_token;
            this.connected = true;
            logger_1.logger.info(`Connected to Phantom at ${this.config.endpoint}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Phantom:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.sessionToken) {
            try {
                await axios_1.default.post(`${this.config.endpoint}/rest/ph_user/logout`, {}, {
                    headers: { 'ph-auth-token': this.sessionToken }
                });
            }
            catch (error) {
                logger_1.logger.warn('Error during Phantom logout:', error);
            }
        }
        this.connected = false;
        this.sessionToken = undefined;
    }
    async syncCase(caseData) {
        if (!this.connected)
            throw new Error('Not connected to Phantom');
        const phantomCase = {
            name: caseData.title,
            description: caseData.description,
            severity: this.mapSeverity(caseData.severity),
            status: this.mapStatus(caseData.status),
            owner_id: caseData.assignee,
            tags: caseData.tags.join(','),
            create_time: caseData.createdAt.toISOString()
        };
        try {
            const response = await axios_1.default.post(`${this.config.endpoint}/rest/container`, phantomCase, {
                headers: { 'ph-auth-token': this.sessionToken }
            });
            return response.data.id.toString();
        }
        catch (error) {
            logger_1.logger.error('Failed to sync case to Phantom:', error);
            throw error;
        }
    }
    async updateCase(externalId, updates) {
        if (!this.connected)
            throw new Error('Not connected to Phantom');
        const phantomUpdates = {};
        if (updates.title)
            phantomUpdates.name = updates.title;
        if (updates.description)
            phantomUpdates.description = updates.description;
        if (updates.severity)
            phantomUpdates.severity = this.mapSeverity(updates.severity);
        if (updates.status)
            phantomUpdates.status = this.mapStatus(updates.status);
        if (updates.assignee)
            phantomUpdates.owner_id = updates.assignee;
        try {
            await axios_1.default.post(`${this.config.endpoint}/rest/container/${externalId}`, phantomUpdates, {
                headers: { 'ph-auth-token': this.sessionToken }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update case in Phantom:', error);
            throw error;
        }
    }
    async executePlaybook(playbookData) {
        if (!this.connected)
            throw new Error('Not connected to Phantom');
        try {
            const response = await axios_1.default.post(`${this.config.endpoint}/rest/playbook_run`, {
                playbook_id: playbookData.playbookId,
                container_id: playbookData.containerId,
                scope: 'new',
                run: true
            }, {
                headers: { 'ph-auth-token': this.sessionToken }
            });
            return response.data.playbook_run_id.toString();
        }
        catch (error) {
            logger_1.logger.error('Failed to execute playbook in Phantom:', error);
            throw error;
        }
    }
    async getPlaybookStatus(executionId) {
        if (!this.connected)
            throw new Error('Not connected to Phantom');
        try {
            const response = await axios_1.default.get(`${this.config.endpoint}/rest/playbook_run/${executionId}`, {
                headers: { 'ph-auth-token': this.sessionToken }
            });
            return {
                status: response.data.status,
                message: response.data.message,
                startTime: response.data.start_time,
                endTime: response.data.end_time
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get playbook status from Phantom:', error);
            throw error;
        }
    }
    async uploadEvidence(evidenceData, fileBuffer) {
        if (!this.connected)
            throw new Error('Not connected to Phantom');
        // Phantom doesn't have direct evidence upload, but we can create artifacts
        const artifact = {
            container_id: evidenceData.caseId,
            source_data_identifier: evidenceData.id,
            name: evidenceData.name,
            label: evidenceData.type,
            type: 'file',
            data: evidenceData.metadata
        };
        try {
            const response = await axios_1.default.post(`${this.config.endpoint}/rest/artifact`, artifact, {
                headers: { 'ph-auth-token': this.sessionToken }
            });
            return response.data.id.toString();
        }
        catch (error) {
            logger_1.logger.error('Failed to upload evidence to Phantom:', error);
            throw error;
        }
    }
    isConnected() {
        return this.connected;
    }
    mapSeverity(severity) {
        const mapping = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'critical': 'high'
        };
        return mapping[severity] || 'medium';
    }
    mapStatus(status) {
        const mapping = {
            'open': 'new',
            'in-progress': 'open',
            'resolved': 'closed',
            'closed': 'closed',
            'escalated': 'open'
        };
        return mapping[status] || 'new';
    }
}
class DemistoConnector {
    constructor(config) {
        this.connected = false;
        this.config = config;
    }
    async connect() {
        try {
            // Test connection with a simple API call
            await axios_1.default.get(`${this.config.endpoint}/info`, {
                headers: { 'Authorization': this.config.apiKey }
            });
            this.connected = true;
            logger_1.logger.info(`Connected to Demisto at ${this.config.endpoint}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Demisto:', error);
            throw error;
        }
    }
    async disconnect() {
        this.connected = false;
    }
    async syncCase(caseData) {
        if (!this.connected)
            throw new Error('Not connected to Demisto');
        const demistoIncident = {
            name: caseData.title,
            details: caseData.description,
            severity: this.mapSeverity(caseData.severity),
            status: this.mapStatus(caseData.status),
            owner: caseData.assignee,
            labels: caseData.tags.map(tag => ({ type: 'Tag', value: tag })),
            occurred: caseData.createdAt.toISOString()
        };
        try {
            const response = await axios_1.default.post(`${this.config.endpoint}/incident`, demistoIncident, {
                headers: { 'Authorization': this.config.apiKey }
            });
            return response.data.id;
        }
        catch (error) {
            logger_1.logger.error('Failed to sync case to Demisto:', error);
            throw error;
        }
    }
    async updateCase(externalId, updates) {
        if (!this.connected)
            throw new Error('Not connected to Demisto');
        const demistoUpdates = {};
        if (updates.title)
            demistoUpdates.name = updates.title;
        if (updates.description)
            demistoUpdates.details = updates.description;
        if (updates.severity)
            demistoUpdates.severity = this.mapSeverity(updates.severity);
        if (updates.status)
            demistoUpdates.status = this.mapStatus(updates.status);
        if (updates.assignee)
            demistoUpdates.owner = updates.assignee;
        try {
            await axios_1.default.post(`${this.config.endpoint}/incident/${externalId}`, demistoUpdates, {
                headers: { 'Authorization': this.config.apiKey }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update case in Demisto:', error);
            throw error;
        }
    }
    async executePlaybook(playbookData) {
        if (!this.connected)
            throw new Error('Not connected to Demisto');
        try {
            const response = await axios_1.default.post(`${this.config.endpoint}/playbook/${playbookData.playbookId}/run`, {
                incidentId: playbookData.incidentId,
                inputs: playbookData.inputs || {}
            }, {
                headers: { 'Authorization': this.config.apiKey }
            });
            return response.data.executionId;
        }
        catch (error) {
            logger_1.logger.error('Failed to execute playbook in Demisto:', error);
            throw error;
        }
    }
    async getPlaybookStatus(executionId) {
        if (!this.connected)
            throw new Error('Not connected to Demisto');
        try {
            const response = await axios_1.default.get(`${this.config.endpoint}/playbook/execution/${executionId}`, {
                headers: { 'Authorization': this.config.apiKey }
            });
            return {
                status: response.data.status,
                result: response.data.result,
                startTime: response.data.startTime,
                endTime: response.data.endTime
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get playbook status from Demisto:', error);
            throw error;
        }
    }
    async uploadEvidence(evidenceData, fileBuffer) {
        if (!this.connected)
            throw new Error('Not connected to Demisto');
        const formData = new FormData();
        if (fileBuffer) {
            formData.append('file', new Blob([fileBuffer]), evidenceData.name);
        }
        formData.append('incidentId', evidenceData.caseId);
        formData.append('description', evidenceData.description || '');
        try {
            const response = await axios_1.default.post(`${this.config.endpoint}/evidence`, formData, {
                headers: {
                    'Authorization': this.config.apiKey,
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data.id;
        }
        catch (error) {
            logger_1.logger.error('Failed to upload evidence to Demisto:', error);
            throw error;
        }
    }
    isConnected() {
        return this.connected;
    }
    mapSeverity(severity) {
        const mapping = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4
        };
        return mapping[severity] || 2;
    }
    mapStatus(status) {
        const mapping = {
            'open': 1,
            'in-progress': 1,
            'resolved': 2,
            'closed': 2,
            'escalated': 1
        };
        return mapping[status] || 1;
    }
}
class SOARIntegrationService extends events_1.EventEmitter {
    constructor() {
        super();
        this.integrations = new Map();
        this.connectors = new Map();
    }
    async initialize() {
        logger_1.logger.info('Initializing SOAR Integration Service');
        // Load integrations from configuration
        await this.loadIntegrations();
        logger_1.logger.info('SOAR Integration Service initialized successfully');
    }
    async loadIntegrations() {
        // In production, this would load from database or configuration
        // For now, we'll use mock configurations
        const mockIntegrations = [
            {
                id: 'phantom-1',
                name: 'Phantom SOAR',
                type: 'phantom',
                endpoint: 'https://phantom.company.com',
                apiKey: 'phantom-api-key',
                enabled: false,
                config: {
                    username: 'api-user',
                    password: 'api-password'
                }
            },
            {
                id: 'demisto-1',
                name: 'Demisto XSOAR',
                type: 'demisto',
                endpoint: 'https://demisto.company.com',
                apiKey: 'demisto-api-key',
                enabled: false,
                config: {}
            }
        ];
        for (const integration of mockIntegrations) {
            this.integrations.set(integration.id, integration);
            if (integration.enabled) {
                await this.createConnector(integration);
            }
        }
    }
    async createConnector(integration) {
        let connector;
        switch (integration.type) {
            case 'phantom':
                connector = new PhantomConnector(integration);
                break;
            case 'demisto':
                connector = new DemistoConnector(integration);
                break;
            default:
                throw new Error(`Unsupported SOAR type: ${integration.type}`);
        }
        try {
            await connector.connect();
            this.connectors.set(integration.id, connector);
            this.emit('integration-connected', { integrationId: integration.id });
            return connector;
        }
        catch (error) {
            logger_1.logger.error(`Failed to connect to ${integration.name}:`, error);
            this.emit('integration-error', { integrationId: integration.id, error: error.message });
            throw error;
        }
    }
    // Case Synchronization
    async syncCaseToSOAR(caseData, integrationId) {
        const results = {};
        const targetIntegrations = integrationId
            ? [integrationId]
            : Array.from(this.connectors.keys());
        for (const id of targetIntegrations) {
            const connector = this.connectors.get(id);
            if (!connector || !connector.isConnected()) {
                logger_1.logger.warn(`Connector ${id} not available for case sync`);
                continue;
            }
            try {
                const externalId = await connector.syncCase(caseData);
                results[id] = externalId;
                this.emit('case-synced', {
                    caseId: caseData.id,
                    integrationId: id,
                    externalId
                });
                logger_1.logger.info(`Synced case ${caseData.id} to ${id} as ${externalId}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to sync case ${caseData.id} to ${id}:`, error);
                this.emit('sync-error', {
                    caseId: caseData.id,
                    integrationId: id,
                    error: error.message
                });
            }
        }
        return results;
    }
    async updateCaseInSOAR(caseId, updates, externalMappings) {
        for (const [integrationId, externalId] of Object.entries(externalMappings)) {
            const connector = this.connectors.get(integrationId);
            if (!connector || !connector.isConnected()) {
                logger_1.logger.warn(`Connector ${integrationId} not available for case update`);
                continue;
            }
            try {
                await connector.updateCase(externalId, updates);
                this.emit('case-updated', {
                    caseId,
                    integrationId,
                    externalId
                });
                logger_1.logger.info(`Updated case ${caseId} in ${integrationId} (${externalId})`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to update case ${caseId} in ${integrationId}:`, error);
                this.emit('update-error', {
                    caseId,
                    integrationId,
                    error: error.message
                });
            }
        }
    }
    // Playbook Execution
    async executePlaybookInSOAR(playbookData, integrationId) {
        const connector = this.connectors.get(integrationId);
        if (!connector || !connector.isConnected()) {
            throw new Error(`Connector ${integrationId} not available`);
        }
        try {
            const executionId = await connector.executePlaybook(playbookData);
            this.emit('playbook-executed', {
                playbookId: playbookData.playbookId,
                integrationId,
                executionId
            });
            logger_1.logger.info(`Executed playbook ${playbookData.playbookId} in ${integrationId} as ${executionId}`);
            return executionId;
        }
        catch (error) {
            logger_1.logger.error(`Failed to execute playbook in ${integrationId}:`, error);
            this.emit('execution-error', {
                playbookId: playbookData.playbookId,
                integrationId,
                error: error.message
            });
            return null;
        }
    }
    async getPlaybookStatusFromSOAR(executionId, integrationId) {
        const connector = this.connectors.get(integrationId);
        if (!connector || !connector.isConnected()) {
            throw new Error(`Connector ${integrationId} not available`);
        }
        try {
            return await connector.getPlaybookStatus(executionId);
        }
        catch (error) {
            logger_1.logger.error(`Failed to get playbook status from ${integrationId}:`, error);
            throw error;
        }
    }
    // Evidence Upload
    async uploadEvidenceToSOAR(evidenceData, fileBuffer, integrationId) {
        const results = {};
        const targetIntegrations = integrationId
            ? [integrationId]
            : Array.from(this.connectors.keys());
        for (const id of targetIntegrations) {
            const connector = this.connectors.get(id);
            if (!connector || !connector.isConnected()) {
                logger_1.logger.warn(`Connector ${id} not available for evidence upload`);
                continue;
            }
            try {
                const externalId = await connector.uploadEvidence(evidenceData, fileBuffer);
                results[id] = externalId;
                this.emit('evidence-uploaded', {
                    evidenceId: evidenceData.id,
                    integrationId: id,
                    externalId
                });
                logger_1.logger.info(`Uploaded evidence ${evidenceData.id} to ${id} as ${externalId}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to upload evidence ${evidenceData.id} to ${id}:`, error);
                this.emit('upload-error', {
                    evidenceId: evidenceData.id,
                    integrationId: id,
                    error: error.message
                });
            }
        }
        return results;
    }
    // Integration Management
    async addIntegration(integration) {
        this.integrations.set(integration.id, integration);
        if (integration.enabled) {
            await this.createConnector(integration);
        }
        this.emit('integration-added', { integrationId: integration.id });
    }
    async removeIntegration(integrationId) {
        const connector = this.connectors.get(integrationId);
        if (connector) {
            await connector.disconnect();
            this.connectors.delete(integrationId);
        }
        this.integrations.delete(integrationId);
        this.emit('integration-removed', { integrationId });
    }
    async enableIntegration(integrationId) {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error(`Integration ${integrationId} not found`);
        }
        integration.enabled = true;
        await this.createConnector(integration);
        this.emit('integration-enabled', { integrationId });
    }
    async disableIntegration(integrationId) {
        const integration = this.integrations.get(integrationId);
        if (integration) {
            integration.enabled = false;
        }
        const connector = this.connectors.get(integrationId);
        if (connector) {
            await connector.disconnect();
            this.connectors.delete(integrationId);
        }
        this.emit('integration-disabled', { integrationId });
    }
    // Health Check
    async checkIntegrationHealth() {
        const health = {};
        for (const [id, connector] of this.connectors) {
            health[id] = connector.isConnected();
        }
        return health;
    }
    // Statistics
    getIntegrationStatistics() {
        const stats = {
            totalIntegrations: this.integrations.size,
            enabledIntegrations: Array.from(this.integrations.values()).filter(i => i.enabled).length,
            connectedIntegrations: this.connectors.size,
            byType: {}
        };
        for (const integration of this.integrations.values()) {
            stats.byType[integration.type] = (stats.byType[integration.type] || 0) + 1;
        }
        return stats;
    }
    async shutdown() {
        logger_1.logger.info('Shutting down SOAR Integration Service');
        // Disconnect all connectors
        for (const connector of this.connectors.values()) {
            await connector.disconnect();
        }
        this.connectors.clear();
        logger_1.logger.info('SOAR Integration Service shutdown complete');
    }
}
exports.SOARIntegrationService = SOARIntegrationService;
