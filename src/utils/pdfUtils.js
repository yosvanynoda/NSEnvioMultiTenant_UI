import apiClient from '../api/apiClient';

export async function openPdfInTab(endpoint, params) {
  const win = window.open('', '_blank');
  try {
    const response = await apiClient.get(endpoint, { responseType: 'blob', params });
    const url = URL.createObjectURL(response.data);
    if (win) win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } catch (err) {
    if (win) win.close();
    throw err;
  }
}

export async function openPdfInTabPost(endpoint, body) {
  const win = window.open('', '_blank');
  try {
    const response = await apiClient.post(endpoint, body, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    if (win) win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } catch (err) {
    if (win) win.close();
    throw err;
  }
}

/**
 * Fetches a PDF blob URL from the API (for embedding in an <iframe>).
 * The caller is responsible for calling URL.revokeObjectURL(url) when done.
 */
export async function fetchPdfBlobUrl(endpoint, params) {
  const response = await apiClient.get(endpoint, { responseType: 'blob', params });
  return URL.createObjectURL(response.data);
}

/**
 * POSTs to an API endpoint, receives a file blob, and triggers a browser download.
 */
export async function downloadBlobPost(endpoint, payload, filename) {
  const response = await apiClient.post(endpoint, payload, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
