/**
 * Vitest Setup Verification Test
 *
 * Simple test to verify Vitest configuration
 * Created: Phase 3.3 - Frontend Testing Infrastructure
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Simple component for testing
function TestComponent() {
  return <div>Vitest is working!</div>;
}

describe('Vitest Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have testing environment configured', () => {
    expect(import.meta.env.VITE_API_URL).toBeDefined();
  });

  it('should render React components', () => {
    render(<TestComponent />);
    expect(screen.getByText('Vitest is working!')).toBeInTheDocument();
  });

  it('should support @testing-library/jest-dom matchers', () => {
    render(<div data-testid="test">Hello</div>);
    const element = screen.getByTestId('test');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello');
  });
});
