import { describe, it, expect } from 'vitest';

describe('Chat History Filtering and Execution Summary', () => {
  it('filters conversationHistory excluding greetings and errors, and maps toolsExecuted', () => {
    const messages = [
      { role: 'assistant' as const, content: 'Ask me anything', isGreeting: true },
      { role: 'user' as const, content: 'Is air bad?' },
      {
        role: 'assistant' as const,
        content: 'Unable to connect. Please try asking again.',
        isError: true,
      },
      { role: 'user' as const, content: 'Can I exercise?' },
      { role: 'assistant' as const, content: 'Yes, AQI is moderate.' },
    ];

    const validHistory = messages.filter((m) => !m.isGreeting && !m.isError);
    expect(validHistory).toHaveLength(3);
    expect(validHistory.map((m) => m.content)).toEqual([
      'Is air bad?',
      'Can I exercise?',
      'Yes, AQI is moderate.',
    ]);

    const toolsExecuted = [
      { name: 'getAirQualityAndForecast', resultSummary: 'AQI 85' },
      { name: 'getAirQualityAndForecast', resultSummary: 'AQI 85' },
      { name: 'calculateActionImpact', resultSummary: 'Impact calculated' },
      { name: 'calculateActionImpact' },
    ];
    const rawTools = toolsExecuted.map((t: { resultSummary?: string }) => t.resultSummary);
    const toolsSummary = Array.from(
      new Set(rawTools.filter((s: unknown): s is string => Boolean(s)))
    );
    expect(toolsSummary).toEqual(['AQI 85', 'Impact calculated']);
  });
});
