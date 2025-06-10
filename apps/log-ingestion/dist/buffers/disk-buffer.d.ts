/**
 * High-performance disk buffer with compression support
 * Provides persistent storage for events with guaranteed delivery
 */
export declare class DiskBuffer<T> {
    private bufferPath;
    private maxSize;
    private compressionEnabled;
    private writeStream?;
    private readPosition;
    private writePosition;
    private itemCount;
    private isInitialized;
    constructor(bufferPath: string, maxSize: number, compressionEnabled?: boolean);
    initialize(): Promise<void>;
    write(item: T): Promise<void>;
    read(count?: number): Promise<T[]>;
    getSize(): Promise<number>;
    clear(): Promise<void>;
    close(): Promise<void>;
    private compress;
    private decompress;
    private recoverState;
    getStats(): {
        path: string;
        maxSize: number;
        itemCount: number;
        readPosition: number;
        writePosition: number;
        compressionEnabled: boolean;
        isInitialized: boolean;
    };
}
//# sourceMappingURL=disk-buffer.d.ts.map