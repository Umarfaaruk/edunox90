/**
 * NDLI (National Digital Library of India) API Proxy
 * ===================================================
 * Proxies search requests to the NDLI API to handle CORS and rate limiting.
 * Endpoint: /api/ndli?q=<query>&type=<ebook|notebook|all>&page=<num>
 */

const NDLI_BASE = "https://ndl.iitkgp.ac.in/api";

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { q, type = "all", page = "1" } = req.query;

  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return res.status(400).json({ error: "Query parameter 'q' is required (min 2 chars)" });
  }

  try {
    // Build NDLI search URL
    // NDLI provides an open search endpoint — no API key required for basic search
    const searchUrl = new URL(`${NDLI_BASE}/search`);
    searchUrl.searchParams.set("q", q.trim());
    searchUrl.searchParams.set("page", page);
    searchUrl.searchParams.set("size", "20");

    if (type === "ebook") {
      searchUrl.searchParams.set("type", "book");
    } else if (type === "notebook") {
      searchUrl.searchParams.set("type", "notebook");
    }

    const response = await fetch(searchUrl.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "EduOnx-LearningPlatform/1.0",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (response.status === 429) {
      return res.status(429).json({
        error: "NDLI rate limit exceeded. Please wait a moment and try again.",
        retryAfter: response.headers.get("Retry-After") || "30",
      });
    }

    if (!response.ok) {
      // Fallback: use NDLI's public web search as alternative
      const fallbackResults = await searchNDLIFallback(q.trim(), type, parseInt(page));
      return res.status(200).json(fallbackResults);
    }

    const data = await response.json();
    
    // Normalize response
    const results = {
      query: q,
      page: parseInt(page),
      totalResults: data.total || data.hits?.total?.value || 0,
      items: (data.hits?.hits || data.results || []).map((item) => ({
        id: item._id || item.id || "",
        title: item._source?.title || item.title || "Untitled",
        author: item._source?.author || item.author || "Unknown",
        type: item._source?.type || item.type || type,
        description: item._source?.description || item.description || "",
        thumbnail: item._source?.thumbnail || item.thumbnail || null,
        url: item._source?.url || `https://ndl.iitkgp.ac.in/document/${item._id || item.id}`,
        year: item._source?.year || item.year || null,
        subject: item._source?.subject || item.subject || null,
        language: item._source?.language || item.language || "English",
      })),
    };

    // Cache for 5 minutes
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(results);
  } catch (error) {
    console.error("[NDLI API] Error:", error);
    
    // Return demo data as graceful fallback
    const fallbackResults = await searchNDLIFallback(q.trim(), type, parseInt(page));
    return res.status(200).json(fallbackResults);
  }
}

/**
 * Fallback: scrape NDLI public search results if API is unavailable
 */
async function searchNDLIFallback(query, type, page) {
  try {
    const url = `https://ndl.iitkgp.ac.in/result?q=${encodeURIComponent(query)}&page=${page}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "EduOnx-LearningPlatform/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) throw new Error("Fallback failed");

    // Return minimal structure with link to NDLI
    return {
      query,
      page,
      totalResults: 0,
      items: [],
      fallback: true,
      ndliSearchUrl: url,
      message: "Direct API unavailable. Use the NDLI search link below.",
    };
  } catch {
    return {
      query,
      page,
      totalResults: 0,
      items: [],
      fallback: true,
      ndliSearchUrl: `https://ndl.iitkgp.ac.in/result?q=${encodeURIComponent(query)}`,
      message: "NDLI search is available via the direct link below.",
    };
  }
}
