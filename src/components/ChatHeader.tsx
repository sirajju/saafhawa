'use client';

import { CloseIcon } from './ui/Icons';
import { getShortPlaceName } from '@/lib/design-system';
import { formatMeasurementTime } from '@/lib/air-quality/time-utils';

export interface ChatHeaderProps {
  headingId?: string;
  place?: string;
  dataSource?: string;
  measuredTime?: string;
  timeZone?: string;
  onClose?: () => void;
}

export function ChatHeader({
  headingId = 'chat-heading',
  place,
  dataSource,
  measuredTime,
  timeZone = 'Asia/Kolkata',
  onClose,
}: ChatHeaderProps) {
  const shortPlace = getShortPlaceName(place);
  const activeSource = dataSource || 'Open-Meteo (CAMS model)';
  const formattedTime = measuredTime ? formatMeasurementTime(measuredTime, timeZone) : null;

  return (
    <div className="chat-head flex items-center justify-between">
      <div>
        <h3 id={headingId}>
          Ask SaafHawa
          <span className="sr-only"> Assistant</span>
        </h3>
        <p className="caption">Answers use today&apos;s {shortPlace} data</p>
        <div className="caption" style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
          <span>
            <span>{activeSource}</span>
            {formattedTime && <span> · Measured at: {formattedTime}</span>}
          </span>
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="btn btn-ghost"
          style={{ width: '36px', height: '36px', padding: 0 }}
        >
          <CloseIcon className="icon" />
        </button>
      )}
    </div>
  );
}
