import { EventEmitter } from 'events';
import { SOARIntegration, Case, Evidence } from '../types/incident-response.types';
export declare class SOARIntegrationService extends EventEmitter {
    private integrations;
    private connectors;
    constructor();
    initialize(): Promise<void>;
    private loadIntegrations;
    private createConnector;
    syncCaseToSOAR(caseData: Case, integrationId?: string): Promise<{
        [integrationId: string]: string;
    }>;
    updateCaseInSOAR(caseId: string, updates: Partial<Case>, externalMappings: {
        [integrationId: string]: string;
    }): Promise<void>;
    executePlaybookInSOAR(playbookData: any, integrationId: string): Promise<string | null>;
    getPlaybookStatusFromSOAR(executionId: string, integrationId: string): Promise<any>;
    uploadEvidenceToSOAR(evidenceData: Evidence, fileBuffer?: Buffer, integrationId?: string): Promise<{
        [integrationId: string]: string;
    }>;
    addIntegration(integration: SOARIntegration): Promise<void>;
    removeIntegration(integrationId: string): Promise<void>;
    enableIntegration(integrationId: string): Promise<void>;
    disableIntegration(integrationId: string): Promise<void>;
    checkIntegrationHealth(): Promise<{
        [integrationId: string]: boolean;
    }>;
    getIntegrationStatistics(): any;
    shutdown(): Promise<void>;
}
