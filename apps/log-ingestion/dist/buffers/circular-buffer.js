/**
 * High-performance circular buffer implementation for memory buffering
 * Provides O(1) operations for add, get, and size operations
 */
export class CircularBuffer {
    buffer;
    capacity;
    head = 0;
    tail = 0;
    size = 0;
    constructor(capacity) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }
    /**
     * Add an item to the buffer
     * @param item Item to add
     * @returns The item that was dropped if buffer was full, undefined otherwise
     */
    add(item) {
        let dropped;
        if (this.size === this.capacity) {
            // Buffer is full, drop oldest item
            dropped = this.buffer[this.head];
            this.head = (this.head + 1) % this.capacity;
        }
        else {
            this.size++;
        }
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        return dropped;
    }
    /**
     * Add an item to the front of the buffer (for re-queuing)
     * @param item Item to add to front
     */
    addFront(item) {
        this.head = (this.head - 1 + this.capacity) % this.capacity;
        this.buffer[this.head] = item;
        if (this.size < this.capacity) {
            this.size++;
        }
        else {
            // Move tail back if buffer was full
            this.tail = (this.tail - 1 + this.capacity) % this.capacity;
        }
    }
    /**
     * Get and remove the oldest item from the buffer
     * @returns The oldest item or undefined if buffer is empty
     */
    get() {
        if (this.size === 0) {
            return undefined;
        }
        const item = this.buffer[this.head];
        this.buffer[this.head] = undefined;
        this.head = (this.head + 1) % this.capacity;
        this.size--;
        return item;
    }
    /**
     * Peek at the oldest item without removing it
     * @returns The oldest item or undefined if buffer is empty
     */
    peek() {
        if (this.size === 0) {
            return undefined;
        }
        return this.buffer[this.head];
    }
    /**
     * Check if the buffer is empty
     * @returns true if buffer is empty
     */
    isEmpty() {
        return this.size === 0;
    }
    /**
     * Check if the buffer is full
     * @returns true if buffer is full
     */
    isFull() {
        return this.size === this.capacity;
    }
    /**
     * Get the current number of items in the buffer
     * @returns Current size
     */
    getSize() {
        return this.size;
    }
    /**
     * Get the buffer capacity
     * @returns Maximum capacity
     */
    getCapacity() {
        return this.capacity;
    }
    /**
     * Get the current usage percentage
     * @returns Usage percentage (0-100)
     */
    getUsagePercentage() {
        return (this.size / this.capacity) * 100;
    }
    /**
     * Clear all items from the buffer
     */
    clear() {
        this.buffer = new Array(this.capacity);
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }
    /**
     * Get all items as an array (for debugging/testing)
     * @returns Array of all items in order
     */
    toArray() {
        const result = [];
        let index = this.head;
        for (let i = 0; i < this.size; i++) {
            const item = this.buffer[index];
            if (item !== undefined) {
                result.push(item);
            }
            index = (index + 1) % this.capacity;
        }
        return result;
    }
    /**
     * Get buffer statistics
     * @returns Buffer statistics
     */
    getStats() {
        return {
            size: this.size,
            capacity: this.capacity,
            usagePercentage: this.getUsagePercentage(),
            isEmpty: this.isEmpty(),
            isFull: this.isFull(),
            head: this.head,
            tail: this.tail
        };
    }
}
//# sourceMappingURL=circular-buffer.js.map