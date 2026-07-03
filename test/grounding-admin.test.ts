/**
 * SSRF guard for the managed-grounding admin console.
 *
 * The console fetches maintainer-supplied URLs, so the private/loopback/link-local
 * blocklist is the security-critical piece. These tests pin its behavior.
 */

import { describe, test, expect } from 'bun:test';
import { isBlockedIp } from '../scripts/grounding-admin';

describe('SSRF address blocklist', () => {
  const blocked = [
    '127.0.0.1',        // loopback
    '10.1.2.3',         // private
    '172.16.5.9',       // private
    '172.31.255.255',   // private (top of /12)
    '192.168.0.1',      // private
    '169.254.169.254',  // link-local / cloud metadata
    '100.64.0.1',       // CGNAT
    '0.0.0.0',          // unspecified
    '224.0.0.1',        // multicast
    '::1',              // IPv6 loopback
    '::',               // IPv6 unspecified
    'fe80::1',          // IPv6 link-local
    'fd00::1',          // IPv6 unique-local
    '::ffff:127.0.0.1', // IPv4-mapped loopback
  ];
  const allowed = [
    '8.8.8.8',
    '1.1.1.1',
    '104.16.0.1',
    '172.15.0.1',       // just outside the private /12
    '172.32.0.1',       // just outside the private /12
    '11.0.0.1',
    '2606:4700:4700::1111', // public IPv6 (Cloudflare)
  ];

  for (const ip of blocked) {
    test(`blocks ${ip}`, () => expect(isBlockedIp(ip)).toBe(true));
  }
  for (const ip of allowed) {
    test(`allows ${ip}`, () => expect(isBlockedIp(ip)).toBe(false));
  }
});
