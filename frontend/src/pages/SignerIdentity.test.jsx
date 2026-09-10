import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SignerFlow from './SignerFlow';
import { publicApi, fetchPublicPdfBlobUrl } from '@/lib/api';

jest.mock('@/lib/pdf', () => ({ PDF_OPTIONS: {} }));
jest.mock('@/components/SignerPdfDocument', () => () => null);
jest.mock('react-router-dom', () => ({ useParams: () => ({ token: 'test-link' }) }));
jest.mock('@/components/Logo', () => ({ Logo: () => null }));
jest.mock('@/components/SignatureModal', () => ({ SignatureModal: () => null }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@/lib/api', () => ({ publicApi: { get: jest.fn(), post: jest.fn() }, fetchPublicPdfBlobUrl: jest.fn(), formatApiError: () => 'Verification unavailable', API_ORIGIN: '' }));
let root, host;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  window.matchMedia = jest.fn(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  publicApi.get.mockResolvedValue({ data: { document: { pages: [] }, fields: [], auth_required: true, auth_method: 'identity', auth_verified: false, signable: true, sender_name: 'Test sender', title: 'Test agreement', recipient: {} } });
  fetchPublicPdfBlobUrl.mockResolvedValue('blob:test'); URL.revokeObjectURL = jest.fn();
  await act(async () => { root.render(<SignerFlow />); });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
for (const status of ['processing', 'requires_input', 'name_mismatch']) {
  test(`${status} keeps the document locked`, async () => {
    publicApi.post.mockResolvedValue({ data: { verified: false, status } });
    await act(async () => host.querySelector('[data-testid="signer-verify-auth"]').click());
    expect(host.querySelector('[data-testid="signer-auth-gate"]')).not.toBeNull();
    expect(fetchPublicPdfBlobUrl).not.toHaveBeenCalled();
  });
}
test('only verified server result unlocks the document', async () => {
  publicApi.post.mockResolvedValue({ data: { verified: true, status: 'verified' } });
  await act(async () => host.querySelector('[data-testid="signer-verify-auth"]').click());
  expect(publicApi.post).toHaveBeenCalledWith('/sign/test-link/identity/status');
  expect(host.querySelector('[data-testid="signer-auth-gate"]')).toBeNull();
  expect(fetchPublicPdfBlobUrl).toHaveBeenCalledWith('/sign/test-link/file');
});
test('provider failure keeps the document locked', async () => {
  publicApi.post.mockRejectedValue(new Error('offline'));
  await act(async () => host.querySelector('[data-testid="signer-verify-auth"]').click());
  expect(host.querySelector('[data-testid="signer-auth-gate"]')).not.toBeNull();
  expect(fetchPublicPdfBlobUrl).not.toHaveBeenCalled();
});
