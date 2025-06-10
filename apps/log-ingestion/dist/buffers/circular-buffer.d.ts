/**
 * High-performance circular buffer implementation for memory buffering
 * Provides O(1) operations for add, get, and size operations
 */
export declare class CircularBuffer<T> {
    private buffer;
    private capacity;
    private head;
    private tail;
    private size;
    constructor(capacity: number);
    /**
     * Add an item to the buffer
     * @param item Item to add
     * @returns The item that was dropped if buffer was full, undefined otherwise
     */
    add(item: T): T | undefined;
    /**
     * Add an item to the front of the buffer (for re-queuing)
     * @param item Item to add to front
     */
    addFront(item: T): void;
    /**
     * Get and remove the oldest item from the buffer
     * @returns The oldest item or undefined if buffer is empty
     */
    get(): T | undefined;
    /**
     * Peek at the oldest item without removing it
     * @returns The oldest item or undefined if buffer is empty
     */
    peek(): T | undefined;
    /**
     * Check if the buffer is empty
     * @returns true if buffer is empty
     */
    isEmpty(): boolean;
    /**
     * Check if the buffer is full
     * @returns true if buffer is full
     */
    isFull(): boolean;
    /**
     * Get the current number of items in the buffer
     * @returns Current size
     */
    getSize(): number;
    /**
     * Get the buffer capacity
     * @returns Maximum capacity
     */
    getCapacity(): number;
    /**
     * Get the current usage percentage
     * @returns Usage percentage (0-100)
     */
    getUsagePercentage(): number;
    /**
     * Clear all items from the buffer
     */
    clear(): void;
    /**
     * Get all items as an array (for debugging/testing)
     * @returns Array of all items in order
     */
    toArray(): T[];
    /**
     * Get buffer statistics
     * @returns Buffer statistics
     */
    getStats(): {
        size: number;
        capacity: number;
        usagePercentage: number;
        isEmpty: boolean;
        isFull: boolean;
        head: number;
        tail: number;
    };
}
//# sourceMappingURL=circular-buffer.d.ts.map