/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WorkshopContext,
  WorkshopInteractionEvent,
  WorkshopInteractionInput,
} from './types';

export const createResearchId = (prefix: string): string => {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
};

export const createInteractionEvent = (
  sessionId: string | undefined,
  input: WorkshopInteractionInput,
  now = new Date()
): WorkshopInteractionEvent => ({
  ...input,
  id: createResearchId('event'),
  timestamp: now.toISOString(),
  sessionId,
});

export interface ResearchLogExport {
  sessionId: string;
  exportedAt: string;
  workshopContext: WorkshopContext;
  interactions: WorkshopInteractionEvent[];
}

export const buildResearchExport = (
  sessionId: string | undefined,
  workshopContext: WorkshopContext,
  interactions: WorkshopInteractionEvent[],
  now = new Date()
): ResearchLogExport => ({
  sessionId: sessionId || 'unknown-session',
  exportedAt: now.toISOString(),
  workshopContext,
  interactions,
});

export const serializeResearchLogJson = (data: ResearchLogExport): string =>
  JSON.stringify(data, null, 2);

const csvCell = (value: unknown): string => {
  const serialized =
    value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return `"${serialized.replace(/"/g, '""')}"`;
};

export const serializeResearchLogCsv = (events: WorkshopInteractionEvent[]): string => {
  const headers = [
    'timestamp',
    'sessionId',
    'stage',
    'subStep',
    'actionType',
    'entityType',
    'entityId',
    'originalValue',
    'newValue',
    'metadata',
  ];
  const rows = events.map((event) =>
    [
      event.timestamp,
      event.sessionId,
      event.stage,
      event.subStep,
      event.actionType,
      event.entityType,
      event.entityId,
      event.originalValue,
      event.newValue,
      event.metadata,
    ]
      .map(csvCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

export const downloadResearchFile = (filename: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
