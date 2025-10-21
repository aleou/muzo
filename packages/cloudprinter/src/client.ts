/**
 * ============================================================================
 * CLOUDPRINTER API CLIENT
 * ============================================================================
 * 
 * Professional HTTP client for CloudPrinter API with:
 * - Simple API key authentication
 * - Automatic retries with exponential backoff
 * - Type-safe responses with Zod validation
 * - Comprehensive error handling
 * 
 * Note: CloudPrinter uses POST for all API calls (different from REST standard)
 * 
 * @see https://www.cloudprinter.com/docs
 */

import type {
  CloudPrinterClientConfig,
  CloudPrinterError,
} from "./types";

/**
 * ============================================================================
 * CLOUDPRINTER API ERROR
 * ============================================================================
 */

export class CloudPrinterApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: CloudPrinterError,
    public endpoint?: string,
  ) {
    super(message);
    this.name = "CloudPrinterApiError";
  }
}

/**
 * ============================================================================
 * CLOUDPRINTER API CLIENT
 * ============================================================================
 */

export class CloudPrinterClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: CloudPrinterClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.cloudprinter.com/cloudcore/1.0";
    this.timeout = config.timeout ?? 30000; // 30 seconds
  }

  /**
   * Make a POST request to the CloudPrinter API
   * Note: All CloudPrinter API calls use POST method
   */
  async post<T>(
    endpoint: string,
    data: Record<string, unknown> = {},
    options: {
      retryCount?: number;
    } = {},
  ): Promise<T> {
    const { retryCount = 0 } = options;

    // Build URL
    const url = `${this.baseUrl}${endpoint}`;

    // Always include API key in request body
    const requestBody = {
      apikey: this.apiKey,
      ...data,
    };

    // Build request options
    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeout),
    };

    try {
      console.log(`[CloudPrinter] POST ${endpoint}`);

      const response = await fetch(url, requestOptions);

      // Handle server errors with retry (5xx)
      if (response.status >= 500 && retryCount < 3) {
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.warn(
          `[CloudPrinter] Server error (${response.status}). Retrying in ${backoffMs}ms... (attempt ${retryCount + 1}/3)`,
        );
        await this.sleep(backoffMs);
        return this.post<T>(endpoint, data, { retryCount: retryCount + 1 });
      }

      // Parse response
      const responseText = await response.text();
      let parsedData: T;

      try {
        parsedData = responseText ? JSON.parse(responseText) : ({} as T);
      } catch {
        throw new CloudPrinterApiError(
          "Failed to parse response JSON",
          response.status,
          undefined,
          endpoint,
        );
      }

      // Handle specific CloudPrinter status codes
      // 200: Success with data
      // 201: Created successfully
      // 204: No content (empty response is OK)
      // 400: Bad request
      // 403: Forbidden
      // 409: Conflict (wrong order state)
      // 410: Gone (order not found)

      if (response.status === 204) {
        // No content - return empty object
        return {} as T;
      }

      if (response.status === 200 || response.status === 201) {
        return parsedData;
      }

      // Handle error responses
      const errorMessage =
        (parsedData as any)?.message ?? `HTTP ${response.status}: ${response.statusText}`;
      
      throw new CloudPrinterApiError(
        errorMessage,
        response.status,
        parsedData as CloudPrinterError,
        endpoint,
      );
    } catch (error) {
      if (error instanceof CloudPrinterApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "TimeoutError") {
          throw new CloudPrinterApiError(
            `Request timeout after ${this.timeout}ms`,
            undefined,
            undefined,
            endpoint,
          );
        }

        throw new CloudPrinterApiError(
          `Request failed: ${error.message}`,
          undefined,
          undefined,
          endpoint,
        );
      }

      throw new CloudPrinterApiError("Unknown error occurred", undefined, undefined, endpoint);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
