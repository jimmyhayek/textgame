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

    test('should not call listener after deregistration', () => {
        const mockListener = jest.fn();
        const eventType = 'testEvent';

        emitter.on(eventType, mockListener);
        emitter.off(eventType, mockListener);
        emitter.emit(eventType);

        expect(mockListener).not.toHaveBeenCalled();
    });
});