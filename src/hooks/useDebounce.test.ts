import { renderHook, act } from '@testing-library/react';
import useDebounce from './useDebounce';

// Use Jest's fake timers
jest.useFakeTimers();

describe('useDebounce hook', () => {
  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should update to the new value after the specified delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    // Value should still be 'first' immediately
    expect(result.current).toBe('first');

    // Rerender with a new value
    act(() => {
      rerender({ value: 'second', delay: 500 });
    });
    
    // Value should still be 'first' because timer hasn't run yet
    expect(result.current).toBe('first');

    // Fast-forward time by 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Now the value should be 'second'
    expect(result.current).toBe('second');
  });

  it('should only update to the latest value if value changes multiple times within delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } }
    );

    expect(result.current).toBe('a');

    act(() => {
      rerender({ value: 'b', delay: 500 });
    });
    // Fast-forward time by 200ms (less than delay)
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // Value should still be 'a'
    expect(result.current).toBe('a');

    act(() => {
      rerender({ value: 'c', delay: 500 });
    });
    // Fast-forward time by another 200ms (total 400ms for 'b', 200ms for 'c')
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // Value should still be 'a'
    expect(result.current).toBe('a');
    
    // Fast-forward time by another 300ms (total 700ms for 'b', 500ms for 'c')
    // The timer for 'b' would have completed, but it was cleared by 'c'.
    // Now the timer for 'c' should complete.
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('c');
  });

  it('should handle changes in delay correctly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 500 } }
    );

    expect(result.current).toBe('test');

    // Change delay
    act(() => {
      rerender({ value: 'test-new-delay', delay: 1000 });
    });
    
    // Fast-forward by old delay (500ms)
    act(() => {
      jest.advanceTimersByTime(500);
    });
    // Value should still be 'test' because the new delay is 1000ms
    // and the timer for 'test' was cleared.
    expect(result.current).toBe('test'); 

    // Fast-forward by remaining new delay (another 500ms)
    act(() => {
      jest.advanceTimersByTime(500);
    });
    // Now value should update to 'test-new-delay'
    expect(result.current).toBe('test-new-delay');
  });

   it('should clear timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
    );

    act(() => {
        rerender({ value: 'updated', delay: 500 });
    });
    
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2); // Initial + rerender
    clearTimeoutSpy.mockRestore();
  });
});
