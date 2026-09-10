jest.mock('axios', () => jest.requireActual('axios/dist/node/axios.cjs'));
import api, { restoreSession, AUTH_TIMEOUT_MS } from './api';

function failure(status, config) {
  return { response: { status }, config };
}

afterEach(() => jest.restoreAllMocks());

test('session check allows backend wake-up without a duplicate automatic refresh', async () => {
  const get = jest.spyOn(api, 'get').mockResolvedValue({ data: { user_id: 'test' } });
  expect(await restoreSession()).toEqual({ user_id: 'test' });
  expect(get).toHaveBeenCalledWith('/auth/me', { timeout: AUTH_TIMEOUT_MS, _skipAuthRefresh: true });
});

test('temporary refresh failure remains a connection error, not signed out', async () => {
  jest.spyOn(api, 'get').mockRejectedValue(failure(401));
  const timeout = { code: 'ECONNABORTED' };
  jest.spyOn(api, 'post').mockRejectedValue(timeout);
  await expect(restoreSession()).rejects.toBe(timeout);
});

test('expired refresh credentials return signed out', async () => {
  jest.spyOn(api, 'get').mockRejectedValue(failure(401));
  jest.spyOn(api, 'post').mockRejectedValue(failure(401));
  expect(await restoreSession()).toBeNull();
});

test('successful refresh restores the user', async () => {
  jest.spyOn(api, 'get').mockRejectedValueOnce(failure(401)).mockResolvedValueOnce({ data: { user_id: 'restored' } });
  jest.spyOn(api, 'post').mockResolvedValue({ data: {} });
  expect(await restoreSession()).toEqual({ user_id: 'restored' });
});
