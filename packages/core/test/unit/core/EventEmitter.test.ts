// test/core/EventEmitter.test.ts
import { EventEmitter } from '../../../src/core/EventEmitter';

describe('EventEmitter', () => {
    let emitter: EventEmitter;

    beforeEach(() => {
        emitter = new EventEmitter();
    });

    test('should emit and receive events', () => {
        const mockListener = jest.fn();
        const eventType = 'testEvent';
        const eventData = { test: 'data' };

        emitter.on(eventType, mockListener);
        emitter.emit(eventType, eventData);

        expect(mockListener).toHaveBeenCalledWith(eventData);
    });

    test('should call multiple listeners for the same event', () => {
        const firstListener = jest.fn();
        const secondListener = jest.fn();
        const eventType = 'multipleListeners';

        emitter.on(eventType, firstListener);
        emitter.on(eventType, secondListener);
        emitter.emit(eventType, 'test');

        expect(firstListener).toHaveBeenCalledWith('test');
        expect(secondListener).toHaveBeenCalledWith('test');
    });

    test('should not call listener after deregistration', () => {
        const mockListener = jest.fn();
        const eventType = 'deregisterTest';

        emitter.on(eventType, mockListener);
        emitter.off(eventType, mockListener);
        emitter.emit(eventType, 'data');

        expect(mockListener).not.toHaveBeenCalled();
    });

    test('should do nothing when emitting event with no listeners', () => {
        // Shouldn't throw an error
        expect(() => {
            emitter.emit('noListenersEvent', 'data');
        }).not.toThrow();
    });

    test('should do nothing when removing non-existent listener', () => {
        const mockListener = jest.fn();

        // Shouldn't throw an error
        expect(() => {
            emitter.off('nonExistentEvent', mockListener);
        }).not.toThrow();
    });

    test('should be able to emit event without data', () => {
        const mockListener = jest.fn();
        emitter.on('noDataEvent', mockListener);

        emitter.emit('noDataEvent');

        expect(mockListener).toHaveBeenCalledWith(undefined);
    });
});