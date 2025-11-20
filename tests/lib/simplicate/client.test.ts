/**
 * Unit Tests for Simplicate API Client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimplicateClient } from '@/lib/simplicate/client';

describe('SimplicateClient', () => {
  let client: SimplicateClient;

  beforeEach(() => {
    client = new SimplicateClient({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      domain: 'test.simplicate.com',
    });
  });

  describe('initialization', () => {
    it('should create client with correct configuration', () => {
      expect(client).toBeDefined();
    });

    it('should construct correct base URL', () => {
      // @ts-ignore - accessing private property for testing
      expect(client.baseUrl).toBe('https://test.simplicate.com/api/v2');
    });

    it('should warn when credentials are missing', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      new SimplicateClient({
        apiKey: '',
        apiSecret: '',
        domain: 'test.com',
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Simplicate API credentials not configured'
      );
    });
  });

  describe('API methods', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should have getProjects method', () => {
      expect(typeof client.getProjects).toBe('function');
    });

    it('should have getProject method', () => {
      expect(typeof client.getProject).toBe('function');
    });

    it('should have getEmployees method', () => {
      expect(typeof client.getEmployees).toBe('function');
    });

    it('should have getHours method', () => {
      expect(typeof client.getHours).toBe('function');
    });

    it('should have getInvoices method', () => {
      expect(typeof client.getInvoices).toBe('function');
    });

    it('should have createWebhook method', () => {
      expect(typeof client.createWebhook).toBe('function');
    });
  });

  describe('authentication', () => {
    it('should generate correct auth header', () => {
      // @ts-ignore - accessing private method for testing
      const authHeader = client.getAuthHeader();
      expect(authHeader).toContain('Basic ');
      expect(authHeader.length).toBeGreaterThan(10);
    });
  });
});
