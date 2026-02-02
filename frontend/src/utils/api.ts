/**
 * URL base da API.
 * - Dev: http://localhost:8000
 * - Produção: '' = mesma origem, /api via proxy nginx (evita CORS)
 * - Se VITE_API_URL for api.vertixbet.site, usa '' para forçar proxy
 */
const envUrl = import.meta.env.VITE_API_URL || '';
const isApiVertixbet = envUrl.includes('api.vertixbet.site');
export const API_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : isApiVertixbet
    ? ''
    : envUrl || '';
