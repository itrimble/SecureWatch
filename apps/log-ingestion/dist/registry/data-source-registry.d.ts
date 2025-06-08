import { DataSource, DataSourceConfig, DataSourceType, DataSourceRegistry } from '../types/data-source.types';
export declare class DefaultDataSourceRegistry implements DataSourceRegistry {
    private factories;
    constructor();
    register(type: DataSourceType, factory: (config: DataSourceConfig) => DataSource): void;
    create(config: DataSourceConfig): DataSource;
    getSupportedTypes(): DataSourceType[];
    private registerDefaultFactories;
}
export declare class CustomDataSource extends DataSource {
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    collect(): Promise<any[]>;
    validateConfig(): Promise<boolean>;
}
export default DefaultDataSourceRegistry;
//# sourceMappingURL=data-source-registry.d.ts.map