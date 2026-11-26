import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MOCK_PLAN } from './fixtures/mock-plan-data';

describe('Dashboard Header Focus Styling', () => {
  it('plan title h1 has outline: none to suppress programmatic focus box', () => {
    const headingRef = React.createRef<HTMLHeadingElement>();
    const { container } = render(
      <DashboardHeader
        headingRef={headingRef}
        plan={MOCK_PLAN}
        currentPlaceName="Connaught Place"
      />
    );

    const h1 = container.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.getAttribute('tabindex')).toBe('-1');
    expect(h1?.style.outlineStyle).toBe('none');
  });
});
