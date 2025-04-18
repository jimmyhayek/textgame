/**
 * Reexport funkcionality z immer pro použití v aplikaci
 * Centralizuje konfiguraci a poskytuje konzistentní API
 */
import { enableMapSet, enablePatches } from 'immer';

// Aktivace podpory pro Map a Set v immer
enableMapSet();

// Aktivace podpory pro patches (příplaty)
enablePatches();

// Reexport hlavních funkcí
export { produce, current, createDraft, finishDraft } from 'immer';