import { loadPage } from './loadPage';

test('returns a successfully loaded module', async () => {
 const module = { default: () => null };
 expect(await loadPage(() => Promise.resolve(module), 'Test')).toBe(module);
});
test('never reloads for application errors', async () => {
 const error = new Error('render failure');
 await expect(loadPage(() => Promise.reject(error), 'Test')).rejects.toBe(error);
});
test('a repeated chunk failure is surfaced instead of looping', async () => {
 sessionStorage.setItem('cs-page-reload:Test', String(Date.now()));
 const error = Object.assign(new Error('missing chunk'), {name:'ChunkLoadError'});
 await expect(loadPage(() => Promise.reject(error), 'Test')).rejects.toBe(error);
 sessionStorage.removeItem('cs-page-reload:Test');
});
