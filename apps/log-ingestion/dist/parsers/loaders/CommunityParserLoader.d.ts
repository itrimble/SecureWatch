import { SigmaRule, OSSECRule, ElasticRule } from '../types';
export declare class CommunityParserLoader {
    private readonly basePath;
    private readonly cacheDir;
    private readonly maxCacheAge;
    constructor(basePath?: string);
    initialize(): Promise<void>;
    loadSigmaRules(): Promise<SigmaRule[]>;
    loadOSSECRules(): Promise<OSSECRule[]>;
    loadElasticRules(): Promise<ElasticRule[]>;
    downloadRules(): Promise<void>;
    clearCache(): Promise<void>;
    private findYamlFiles;
    private findXmlFiles;
    private findJsonFiles;
    private validateSigmaRule;
    private validateElasticRule;
    private parseOSSECXml;
    private parseOSSECRuleBlock;
    private loadFromCache;
    private saveToCache;
    private downloadSigmaRules;
    private downloadOSSECRules;
    private downloadElasticRules;
}
//# sourceMappingURL=CommunityParserLoader.d.ts.map