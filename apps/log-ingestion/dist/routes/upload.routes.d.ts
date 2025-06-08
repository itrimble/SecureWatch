import { Router } from 'express';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
export declare class UploadRoutes {
    private router;
    private producerPool;
    private bufferManager;
    private metrics;
    private processingStatus;
    constructor(producerPool: KafkaProducerPool, bufferManager: BufferManager, metrics: MetricsCollector);
    private setupRoutes;
    /**
     * Process an uploaded file
     */
    private processUpload;
    /**
     * Get processing status for a file
     */
    private getProcessingStatus;
    /**
     * List all processing jobs
     */
    private listProcessingJobs;
    /**
     * Cancel a processing job
     */
    private cancelProcessingJob;
    /**
     * Process file asynchronously
     */
    private processFileAsync;
    /**
     * Process CSV file
     */
    private processCSVFile;
    /**
     * Process XML file
     */
    private processXMLFile;
    /**
     * Process JSON file (JSONL/NDJSON)
     */
    private processJSONFile;
    /**
     * Process plain text file
     */
    private processTextFile;
    /**
     * Process EVTX file
     */
    private processEVTXFile;
    getRouter(): Router;
}
//# sourceMappingURL=upload.routes.d.ts.map