import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import Header from '@/components/Header';

describe('Header', () => {
  it('renders title', () => {
    render(
      <Header
        name="Sarthak Pandey"
        role="AI Engineer"
        resumeConfigured={true}
        voiceEnabled={true}
      />
    );
    expect(screen.getByText('RORI')).toBeInTheDocument();
    expect(screen.getByText(/Sarthak Pandey/i)).toBeInTheDocument();
  });

  it('shows status pills', () => {
    render(
      <Header
        name="Sarthak Pandey"
        role="AI Engineer"
        resumeConfigured={true}
        voiceEnabled={false}
      />
    );
    expect(screen.getByTitle('Systems online')).toBeInTheDocument();
    expect(screen.getByTitle('Voice off')).toBeInTheDocument();
  });
});
