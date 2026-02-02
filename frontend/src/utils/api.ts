/**
 * URL base da API.
 * - Dev: http://localhost:8000
 * - Produção com proxy (VITE_API_URL vazio): '' = mesma origem, /api via nginx
 * - Produção com URL explícita: usa VITE_API_URL
 */
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : '');
