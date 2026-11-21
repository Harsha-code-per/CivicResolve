import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReportForm } from '../../src/ui/ReportForm.js';
import { AuthProvider } from '../../src/auth/AuthProvider.js';
import { authRoutes, fakeAuthService, mockFetch, sampleTriage, seedIssues } from './helpers.js';

const downscale = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/image.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/image.js')>()),
  downscaleImage: downscale,
}));

const fillDraft = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Issue title'), 'Overflowing garbage bin');
  await user.type(screen.getByLabelText('Location or landmark'), 'RS Puram');
  await user.selectOptions(screen.getByLabelText(/Category/), 'waste_management');
  await user.type(screen.getByLabelText('What is wrong?'), 'Bin overflowing for three days.');
};

describe('ReportForm sign-in gate', () => {
  it('asks signed-out citizens to sign in, then files with their ID token', async () => {
    const issue = { ...seedIssues()[1], id: 'CR-2026-1005' };
    const spy = mockFetch({
      ...authRoutes(),
      'POST /api/issues': () => ({ status: 201, body: { issue, triage: sampleTriage } }),
    });
    render(
      <AuthProvider load={fakeAuthService().load}>
        <ReportForm onCreated={vi.fn()} />
      </AuthProvider>,
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Continue as guest' }));
    await fillDraft(user);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByRole('status')).toHaveTextContent('CR-2026-1005');
    const call = spy.mock.calls.find(
      ([url, init]) => url === '/api/issues' && init?.method === 'POST',
    );
    expect(call?.[1]?.headers).toMatchObject({ Authorization: 'Bearer id-token' });
  });
});

describe('ReportForm', () => {
  it('previews Gemini triage, attaches a downscaled photo, and submits it', async () => {
    downscale.mockResolvedValue('data:image/jpeg;base64,AAAA');
    const bodies: unknown[] = [];
    const issue = { ...seedIssues()[1], id: 'CR-2026-1005' };
    mockFetch({
      'POST /api/triage': (body) => {
        bodies.push(body);
        return { body: { triage: { ...sampleTriage, source: 'gemini', model: 'gemini-test' } } };
      },
      'POST /api/issues': (body) => {
        bodies.push(body);
        return { status: 201, body: { issue, triage: sampleTriage } };
      },
    });
    const onCreated = vi.fn();
    render(<ReportForm onCreated={onCreated} />);
    const user = userEvent.setup();
    await fillDraft(user);

    const file = new File(['img'], 'bin.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/Add a photo/), file);
    expect(await screen.findByAltText('Selected evidence preview')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Preview AI triage' }));
    expect(await screen.findByText(/Engine: gemini \(gemini-test\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByRole('status')).toHaveTextContent('CR-2026-1005');
    expect(onCreated).toHaveBeenCalledWith(issue);
    expect(bodies[1]).toMatchObject({
      category: 'waste_management',
      imageDataUrl: 'data:image/jpeg;base64,AAAA',
    });
    expect(screen.getByLabelText('Issue title')).toHaveValue('');
  });

  it('rejects unsupported files and clears the photo when the selection is removed', async () => {
    mockFetch({});
    render(<ReportForm onCreated={vi.fn()} />);
    const user = userEvent.setup({ applyAccept: false });
    const input = screen.getByLabelText(/Add a photo/);
    await user.upload(input, new File(['gif'], 'a.gif', { type: 'image/gif' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('PNG, JPEG, or WebP');
    expect(alert).toHaveFocus();
    await user.upload(input, []);
    expect(screen.queryByAltText('Selected evidence preview')).not.toBeInTheDocument();
  });

  it('shows server validation errors and generic fallbacks', async () => {
    downscale.mockRejectedValueOnce('decoder crashed');
    mockFetch({
      'POST /api/issues': () => ({
        status: 400,
        body: { error: 'Title must be at least 5 characters.' },
      }),
      'POST /api/triage': () => ({ status: 500, body: {} }),
    });
    render(<ReportForm onCreated={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Title must be at least 5 characters.',
    );
    await user.click(screen.getByRole('button', { name: 'Preview AI triage' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed with status 500.');
    await user.upload(
      screen.getByLabelText(/Add a photo/),
      new File(['x'], 'a.png', { type: 'image/png' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Image upload failed.');
  });
});
