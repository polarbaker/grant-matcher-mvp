import React from 'react';
import { render, screen } from '@testing-library/react';
import { GrantList } from '../GrantList';

const mockGrants = [
  {
    id: '1',
    title: 'Innovation Grant 2025',
    organization: 'Tech Foundation',
    description: 'Supporting innovative technology startups',
    amount: {
      min: 50000,
      max: 100000,
      currency: 'USD',
    },
    deadline: '2025-06-30',
    matchScore: 0.85,
    matchReason: 'Matches your focus on AI technology',
    categories: ['Technology', 'AI', 'Startups'],
    applicationUrl: 'https://example.com/grant1',
  },
  {
    id: '2',
    title: 'Green Energy Initiative',
    organization: 'Eco Foundation',
    description: 'Supporting sustainable energy projects',
    amount: {
      min: 75000,
      max: 75000,
      currency: 'USD',
    },
    deadline: '2025-07-15',
    matchScore: 0.75,
    matchReason: 'Matches your sustainability goals',
    categories: ['Energy', 'Sustainability'],
    applicationUrl: 'https://example.com/grant2',
  },
];

describe('GrantList Component', () => {
  test('renders empty message when no grants are provided', () => {
    const emptyMessage = 'No grants found';
    render(<GrantList grants={[]} emptyMessage={emptyMessage} />);
    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  test('renders list of grants correctly', () => {
    render(<GrantList grants={mockGrants} emptyMessage="No grants found" />);
    
    // Check if grant titles are displayed
    expect(screen.getByText('Innovation Grant 2025')).toBeInTheDocument();
    expect(screen.getByText('Green Energy Initiative')).toBeInTheDocument();
    
    // Check if organizations are displayed
    expect(screen.getByText('Tech Foundation')).toBeInTheDocument();
    expect(screen.getByText('Eco Foundation')).toBeInTheDocument();
    
    // Check if match scores are displayed
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  test('renders grant amounts correctly', () => {
    render(<GrantList grants={mockGrants} emptyMessage="No grants found" />);
    
    // Check if amounts are formatted correctly
    expect(screen.getByText('$50,000 - $100,000')).toBeInTheDocument();
    expect(screen.getByText('$75,000')).toBeInTheDocument();
  });

  test('renders grant categories as chips', () => {
    render(<GrantList grants={mockGrants} emptyMessage="No grants found" />);
    
    // Check if categories are displayed
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Startups')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByText('Sustainability')).toBeInTheDocument();
  });

  test('renders apply now buttons with correct links', () => {
    render(<GrantList grants={mockGrants} emptyMessage="No grants found" />);
    
    // Check if Apply Now buttons are present with correct links
    const applyButtons = screen.getAllByText('Apply Now');
    expect(applyButtons).toHaveLength(2);
    
    applyButtons.forEach((button, index) => {
      expect(button.closest('a')).toHaveAttribute(
        'href',
        mockGrants[index].applicationUrl
      );
    });
  });
});
