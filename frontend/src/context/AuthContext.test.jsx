import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './AuthContext';
import api, { restoreSession } from '@/lib/api';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/dashboard' }) }));
jest.mock('@/lib/api', () => ({ __esModule: true, default: { post: jest.fn() }, restoreSession: jest.fn(), AUTH_TIMEOUT_MS: 75000 }));
jest.mock('@/lib/tokenStore', () => ({ clearTokens: jest.fn(), setAccessToken: jest.fn(), getAccessToken: jest.fn(), purgeLegacyTokenStorage: jest.fn() }));
let root, host, auth, finishCheck;
function Consumer() { auth = useAuth(); return null; }
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  restoreSession.mockImplementation(() => new Promise(resolve => { finishCheck = resolve; }));
  host = document.createElement('div'); root = createRoot(host);
  await act(async () => root.render(<AuthProvider><Consumer /></AuthProvider>));
});
afterEach(async () => { await act(async () => root.unmount()); });
test('late signed-out check cannot overwrite successful login', async () => {
  const signal = restoreSession.mock.calls[0][0];
  api.post.mockResolvedValue({ data: { user: { user_id: 'new-session' } } });
  await act(async () => { await auth.login('test@example.com', 'test'); });
  expect(signal.aborted).toBe(true);
  await act(async () => finishCheck(null));
  expect(auth.user.user_id).toBe('new-session');
  expect(auth.authReady).toBe(true);
});
test('registration cancels stale checks and leaves the form ready on error', async () => {
  api.post.mockRejectedValue(new Error('unavailable'));
  await act(async () => { await expect(auth.register('Test', 'test@example.com', 'test')).rejects.toThrow('unavailable'); });
  await act(async () => finishCheck({ user_id: 'old-session' }));
  expect(auth.user).not.toEqual({ user_id: 'old-session' });
  expect(auth.authReady).toBe(true);
});
