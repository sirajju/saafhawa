import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '@/components/ChatPanel';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPanel() {
  return render(
    <ChatPanel
      place="Pune"
      dataSource="Open-Meteo (CAMS model)"
      measuredTime="2026-11-25T10:00:00Z"
      timeZone="Asia/Kolkata"
    />
  );
}

async function ask(question: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Ask clean air assistant' }), question);
  await user.click(screen.getByRole('button', { name: 'Send question' }));
  return user;
}

describe('ChatPanel conversation', () => {
  beforeEach(() => {
    // jsdom does not implement scrolling.
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the question with the place and renders the reply with tool summaries', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        reply: 'The air in Pune is satisfactory, so an evening walk is fine.',
        toolsExecuted: [
          { toolName: 'getAirQualityAndForecast', resultSummary: 'Retrieved AQI 82' },
        ],
      })
    );
    renderPanel();

    await ask('Can we walk at 6 PM?');

    expect(await screen.findByText(/an evening walk is fine/i)).toBeInTheDocument();
    expect(screen.getByText(/Retrieved AQI 82/)).toBeInTheDocument();

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe('/api/chat');
    const body = JSON.parse(String(init?.body)) as { message: string; place: string };
    expect(body.message).toBe('Can we walk at 6 PM?');
    expect(body.place).toBe('Pune');
  });

  it('shows the server error message in the conversation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ message: 'Assistant is busy right now.' }, 503)
    );
    renderPanel();

    await ask('Should I run the purifier?');

    expect(
      await screen.findByText(/Assistant is busy right now\. Please try asking again\./)
    ).toBeInTheDocument();
  });

  it('retries the same question when Gemini was busy and a rule-based answer was shown', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          reply: 'Rule-based tip: keep windows closed.',
          fallbackReason: 'gemini_busy',
        })
      )
      .mockResolvedValueOnce(jsonResponse({ reply: 'Gemini answer: run the purifier on high.' }));
    renderPanel();

    const user = await ask('Should I run the purifier?');
    expect(await screen.findByText(/Gemini is busy right now/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/run the purifier on high/)).toBeInTheDocument();
    const retryBody = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body)) as { message: string };
    expect(retryBody.message).toBe('Should I run the purifier?');
  });
});
