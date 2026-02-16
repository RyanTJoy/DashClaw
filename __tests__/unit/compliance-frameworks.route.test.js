import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockListFrameworks, mockLoadFramework } = vi.hoisted(() => ({
  mockListFrameworks: vi.fn(),
  mockLoadFramework: vi.fn(),
}));

vi.mock('@/lib/compliance/mapper.js', () => ({
  listFrameworks: mockListFrameworks,
  loadFramework: mockLoadFramework,
}));

import { GET } from '@/api/compliance/frameworks/route.js';

describe('/api/compliance/frameworks GET', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns list of frameworks with metadata', async () => {
    mockListFrameworks.mockReturnValue(['soc2', 'gdpr']);
    mockLoadFramework.mockImplementation((id) => ({
      framework: id.toUpperCase(),
      version: '1.0',
      description: `${id} framework`,
      controls: [{ id: 'C1' }, { id: 'C2' }],
    }));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.frameworks).toHaveLength(2);
    expect(data.frameworks[0].id).toBe('soc2');
    expect(data.frameworks[0].control_count).toBe(2);
  });

  it('returns empty list when no frameworks exist', async () => {
    mockListFrameworks.mockReturnValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.frameworks).toEqual([]);
  });

  it('returns 500 on error', async () => {
    mockListFrameworks.mockImplementation(() => { throw new Error('fs error'); });
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it('includes version and name in framework data', async () => {
    mockListFrameworks.mockReturnValue(['iso27001']);
    mockLoadFramework.mockReturnValue({ framework: 'ISO 27001', version: '2022', description: 'Info sec', controls: [] });
    const res = await GET();
    const data = await res.json();
    expect(data.frameworks[0].name).toBe('ISO 27001');
    expect(data.frameworks[0].version).toBe('2022');
  });

  it('includes description in framework data', async () => {
    mockListFrameworks.mockReturnValue(['gdpr']);
    mockLoadFramework.mockReturnValue({ framework: 'GDPR', version: '2016', description: 'EU data protection', controls: [{ id: 'C1' }] });
    const res = await GET();
    const data = await res.json();
    expect(data.frameworks[0].description).toBe('EU data protection');
  });
});
