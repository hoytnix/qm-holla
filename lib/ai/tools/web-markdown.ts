/**
 * Markdowner Tool Handler
 * Integrates with the Markdowner service (https://md.dhr.wtf)
 * to fetch public web URLs and convert them into clean, structured Markdown.
 */

export const fetchUrlAsMarkdownDeclaration = {
  name: 'fetch_url_as_markdown',
  description: 'Fetches any public website URL and returns the page content rendered into clean, structured Markdown ready for analysis.',
  parameters: {
    type: 'OBJECT',
    properties: {
      url: {
        type: 'STRING',
        description: 'The full URL of the website to scrape and convert to markdown (e.g. https://example.com)',
      },
      llmFilter: {
        type: 'BOOLEAN',
        description: 'Optional. Set to true to filter out boilerplate navigation and ads.',
      },
    },
    required: ['url'],
  },
};

const MAX_MARKDOWN_CHARS = 20000;
const FETCH_TIMEOUT_MS = 10000;

/**
 * Executes a web markdown fetch against the Markdowner service (https://md.dhr.wtf).
 *
 * @param url The full URL of the webpage to convert to markdown
 * @param llmFilter Optional flag to strip navigation boilerplate and ads
 * @returns Clean Markdown string, or an informative error message if fetching fails
 */
export async function executeFetchUrlAsMarkdown(
  url: string,
  llmFilter?: boolean
): Promise<string> {
  if (!url || typeof url !== 'string') {
    return `### [Markdowner Tool Error]\n\nInvalid URL provided: "${url}". Please specify a valid web URL.`;
  }

  let normalizedUrl = url.trim();
  // Prepend https:// if protocol was omitted
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const endpoint = `https://md.dhr.wtf/?url=${encodeURIComponent(normalizedUrl)}${
      llmFilter ? '&llmFilter=true' : ''
    }`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain',
          'Accept': 'text/plain',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        return `### [Markdowner Tool Error]\n\nFailed to fetch "${normalizedUrl}". Markdowner service returned status HTTP ${response.status} (${response.statusText}).`;
      }

      const text = await response.text();
      if (!text || !text.trim()) {
        return `### [Markdowner Tool Response]\n\nFetched "${normalizedUrl}", but the rendered markdown was empty.`;
      }

      if (text.length > MAX_MARKDOWN_CHARS) {
        return `${text.slice(0, MAX_MARKDOWN_CHARS)}\n\n---\n*[Content truncated to ${MAX_MARKDOWN_CHARS} characters to preserve model context]*`;
      }

      return text;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return `### [Markdowner Tool Error]\n\nRequest to fetch "${normalizedUrl}" timed out after ${FETCH_TIMEOUT_MS / 1000} seconds. The target website may be slow or unresponsive.`;
    }
    return `### [Markdowner Tool Error]\n\nAn unexpected network error occurred while fetching "${normalizedUrl}": ${err?.message || String(err)}`;
  }
}
