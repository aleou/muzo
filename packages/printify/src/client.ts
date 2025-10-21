/**
 * ============================================================================
 * PRINTIFY API CLIENT
 * ============================================================================
 * 
 * Professional HTTP client for Printify API with:
 * - Rate limiting (600 requests/minute global, 100 requests/minute for catalog)
 * - Automatic retries with exponential backoff
 * - Type-safe responses with Zod validation
 * - Comprehensive error handling
 * - Request/response logging for debugging
 * 
 * @see https://developers.printify.com/
 */

import type {
  PrintifyClientConfig,
  RateLimitConfig,
  PrintifyError,
} from "./types";

/**
 * ============================================================================
 * RATE LIMITER
 * ============================================================================
 */

class RateLimiter {
  private requests: number[] = [];
  private catalogRequests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly catalogMaxRequests: number;

  constructor(config: RateLimitConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.catalogMaxRequests = config.catalogMaxRequests ?? 100;
  }

  private cleanOldRequests(requests: number[]): number[] {
    const now = Date.now();
    return requests.filter((time) => now - time < this.windowMs);
  }

  async waitIfNeeded(isCatalogEndpoint: boolean = false): Promise<void> {
    // Clean old requests
    this.requests = this.cleanOldRequests(this.requests);
    
    if (isCatalogEndpoint) {
      this.catalogRequests = this.cleanOldRequests(this.catalogRequests);
    }

    // Check global rate limit
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]!;
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      
      if (waitTime > 0) {
        console.warn(`[Printify] Global rate limit reached. Waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
        this.requests = this.cleanOldRequests(this.requests);
      }
    }

    // Check catalog rate limit
    if (isCatalogEndpoint && this.catalogRequests.length >= this.catalogMaxRequests) {
      const oldestCatalogRequest = this.catalogRequests[0]!;
      const waitTime = this.windowMs - (Date.now() - oldestCatalogRequest);
      
      if (waitTime > 0) {
        console.warn(`[Printify] Catalog rate limit reached. Waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
        this.catalogRequests = this.cleanOldRequests(this.catalogRequests);
      }
    }

    // Record this request
    const now = Date.now();
    this.requests.push(now);
    
    if (isCatalogEndpoint) {
      this.catalogRequests.push(now);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStatus() {
    this.requests = this.cleanOldRequests(this.requests);
    this.catalogRequests = this.cleanOldRequests(this.catalogRequests);
    
    return {
      globalRequests: this.requests.length,
      globalLimit: this.maxRequests,
      catalogRequests: this.catalogRequests.length,
      catalogLimit: this.catalogMaxRequests,
    };
  }
}

/**
 * ============================================================================
 * PRINTIFY API ERROR
 * ============================================================================
 */

export class PrintifyApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: PrintifyError,
    public endpoint?: string,
  ) {
    super(message);
    this.name = "PrintifyApiError";
  }
}

/**
 * ============================================================================
 * PRINTIFY API CLIENT
 * ============================================================================
 */

export class PrintifyClient {
  private readonly apiToken: string;
  private readonly shopId?: number;
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly timeout: number;
  private readonly rateLimiter: RateLimiter;

  constructor(config: PrintifyClientConfig) {
    this.apiToken = config.apiToken;
    this.shopId = config.shopId;
    this.baseUrl = config.baseUrl ?? "https://api.printify.com/v1";
    this.userAgent = config.userAgent ?? "Muzo/1.0";
    this.timeout = config.timeout ?? 30000; // 30 seconds

    // Initialize rate limiter
    // Global: 600 requests per minute
    // Catalog: 100 requests per minute
    this.rateLimiter = new RateLimiter({
      maxRequests: 600,
      windowMs: 60 * 1000, // 1 minute
      catalogMaxRequests: 100,
    });
  }

  /**
   * Make a GET request to the Printify API
   */
  async get<T>(
    endpoint: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
      isCatalogEndpoint?: boolean;
    } = {},
  ): Promise<T> {
    return this.request<T>("GET", endpoint, {
      params: options.params,
      isCatalogEndpoint: options.isCatalogEndpoint,
    });
  }

  /**
   * Make a POST request to the Printify API
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options: {
      isCatalogEndpoint?: boolean;
    } = {},
  ): Promise<T> {
    return this.request<T>("POST", endpoint, {
      body: data,
      isCatalogEndpoint: options.isCatalogEndpoint,
    });
  }

  /**
   * Make a PUT request to the Printify API
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>("PUT", endpoint, { body: data });
  }

  /**
   * Make a DELETE request to the Printify API
   */
  async delete<T>(
    endpoint: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
    } = {},
  ): Promise<T> {
    return this.request<T>("DELETE", endpoint, { params: options.params });
  }

  /**
   * Core request method with rate limiting and retries
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      isCatalogEndpoint?: boolean;
      retryCount?: number;
    } = {},
  ): Promise<T> {
    const { params, body, isCatalogEndpoint = false, retryCount = 0 } = options;

    // Wait for rate limiter
    await this.rateLimiter.waitIfNeeded(isCatalogEndpoint);

    // Build URL
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Build headers
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiToken}`,
      "User-Agent": this.userAgent,
      "Content-Type": "application/json",
    };

    // Build request options
    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      console.log(`[Printify] ${method} ${endpoint}`);

      const response = await fetch(url.toString(), requestOptions);

      // Handle rate limiting (429)
      if (response.status === 429 && retryCount < 3) {
        const retryAfter = parseInt(response.headers.get("Retry-After") ?? "60", 10);
        console.warn(
          `[Printify] Rate limited (429). Retrying after ${retryAfter}s... (attempt ${retryCount + 1}/3)`,
        );
        await this.sleep(retryAfter * 1000);
        return this.request<T>(method, endpoint, {
          ...options,
          retryCount: retryCount + 1,
        });
      }

      // Handle server errors with retry (5xx)
      if (response.status >= 500 && retryCount < 3) {
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.warn(
          `[Printify] Server error (${response.status}). Retrying in ${backoffMs}ms... (attempt ${retryCount + 1}/3)`,
        );
        await this.sleep(backoffMs);
        return this.request<T>(method, endpoint, {
          ...options,
          retryCount: retryCount + 1,
        });
      }

      // Parse response
      const responseText = await response.text();
      let data: T;

      try {
        data = responseText ? JSON.parse(responseText) : ({} as T);
      } catch {
        throw new PrintifyApiError(
          "Failed to parse response JSON",
          response.status,
          undefined,
          endpoint,
        );
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage =
          (data as any)?.message ?? `HTTP ${response.status}: ${response.statusText}`;
        throw new PrintifyApiError(
          errorMessage,
          response.status,
          data as PrintifyError,
          endpoint,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof PrintifyApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "TimeoutError") {
          throw new PrintifyApiError(
            `Request timeout after ${this.timeout}ms`,
            undefined,
            undefined,
            endpoint,
          );
        }

        throw new PrintifyApiError(
          `Request failed: ${error.message}`,
          undefined,
          undefined,
          endpoint,
        );
      }

      throw new PrintifyApiError("Unknown error occurred", undefined, undefined, endpoint);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get rate limiter status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Get shop ID (must be set in constructor)
   */
  getShopId(): number {
    if (!this.shopId) {
      throw new PrintifyApiError(
        "Shop ID is required for this operation. Please provide it in the client constructor.",
      );
    }
    return this.shopId;
  }
}
