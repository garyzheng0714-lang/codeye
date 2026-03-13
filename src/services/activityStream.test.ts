import { describe, expect, it, vi } from 'vitest';
import { activityStream } from './activityStream';

describe('ActivityStream', () => {
  it('pushes and retrieves entries', () => {
    activityStream.clear();

    activityStream.push({
      type: 'message_sent',
      sessionId: 's1',
      sessionName: 'Test',
      summary: 'User sent a message',
    });

    const entries = activityStream.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('message_sent');
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].timestamp).toBeGreaterThan(0);
  });

  it('filters by type', () => {
    activityStream.clear();

    activityStream.push({
      type: 'message_sent',
      sessionId: 's1',
      sessionName: 'Test',
      summary: 'Sent',
    });
    activityStream.push({
      type: 'error_occurred',
      sessionId: 's1',
      sessionName: 'Test',
      summary: 'Error',
    });

    expect(activityStream.getEntries({ type: 'error_occurred' })).toHaveLength(1);
    expect(activityStream.getEntries({ type: 'message_sent' })).toHaveLength(1);
  });

  it('filters by session', () => {
    activityStream.clear();

    activityStream.push({
      type: 'message_sent',
      sessionId: 's1',
      sessionName: 'Session 1',
      summary: 'test',
    });
    activityStream.push({
      type: 'message_sent',
      sessionId: 's2',
      sessionName: 'Session 2',
      summary: 'test',
    });

    expect(activityStream.getEntries({ sessionId: 's1' })).toHaveLength(1);
    expect(activityStream.getEntries({ sessionId: 's2' })).toHaveLength(1);
  });

  it('limits results', () => {
    activityStream.clear();

    for (let i = 0; i < 10; i++) {
      activityStream.push({
        type: 'message_sent',
        sessionId: 's1',
        sessionName: 'Test',
        summary: `msg ${i}`,
      });
    }

    expect(activityStream.getEntries({ limit: 3 })).toHaveLength(3);
  });

  it('groups by session', () => {
    activityStream.clear();

    activityStream.push({ type: 'message_sent', sessionId: 's1', sessionName: 'A', summary: '1' });
    activityStream.push({ type: 'message_sent', sessionId: 's2', sessionName: 'B', summary: '2' });
    activityStream.push({ type: 'message_sent', sessionId: 's1', sessionName: 'A', summary: '3' });

    const grouped = activityStream.getRecentBySession();
    expect(grouped.get('s1')).toHaveLength(2);
    expect(grouped.get('s2')).toHaveLength(1);
  });

  it('notifies subscribers', () => {
    activityStream.clear();

    const received: number[] = [];
    const unsub = activityStream.subscribe((entries) => {
      received.push(entries.length);
    });

    activityStream.push({ type: 'session_created', sessionId: 's1', sessionName: 'T', summary: 'new' });
    activityStream.push({ type: 'message_sent', sessionId: 's1', sessionName: 'T', summary: 'msg' });

    expect(received).toEqual([1, 2]);
    unsub();
  });

  it('caps at max entries', () => {
    activityStream.clear();

    for (let i = 0; i < 250; i++) {
      activityStream.push({
        type: 'message_sent',
        sessionId: 's1',
        sessionName: 'Test',
        summary: `msg ${i}`,
      });
    }

    expect(activityStream.getEntries().length).toBeLessThanOrEqual(200);
  });
});
