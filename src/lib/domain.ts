const IPV4_PATTERN =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
const DOMAIN_PATTERN = /^[a-zA-Z0-9¡-￿.-]+\.[a-zA-Z0-9¡-￿]{2,}$/;

export function isIPv4(value: string): boolean {
  return IPV4_PATTERN.test(value);
}

/** Loose check: anything made only of hex digits and colons that contains a colon. */
export function isIPv6(value: string): boolean {
  return value.includes(":") && /^[0-9a-fA-F:]+$/.test(value);
}

export function isValidDomain(value: string): boolean {
  return DOMAIN_PATTERN.test(value) || value === "localhost";
}

/**
 * Registrable domain used for RDAP lookups: `www.example.com` -> `example.com`.
 * Short second-level labels under a short TLD are treated as a country-code
 * SLD, so `www.example.co.uk` -> `example.co.uk`.
 */
export function getBaseDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  const sld = parts.at(-2) ?? "";
  const tld = parts.at(-1) ?? "";
  const isCcSld = sld.length <= 3 && tld.length <= 3;
  return parts.slice(isCcSld ? -3 : -2).join(".");
}

/** `1.2.3.4` -> `4.3.2.1.in-addr.arpa` */
export function ipv4ToArpa(ip: string): string {
  return `${reverseIPv4(ip)}.in-addr.arpa`;
}

/** `1.2.3.4` -> `4.3.2.1`, the label order DNS blocklists expect. */
export function reverseIPv4(ip: string): string {
  return ip.split(".").reverse().join(".");
}

/** Expands `::` and returns the nibble-reversed `ip6.arpa` name for a PTR lookup. */
export function ipv6ToArpa(ip: string): string {
  const [head = "", tail = ""] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const missing = 8 - (left.length + right.length);
  const groups = [...left, ...Array<string>(missing).fill("0000"), ...right];
  const nibbles = groups
    .map((group) => group.padStart(4, "0"))
    .join("")
    .split("")
    .reverse()
    .join(".");
  return `${nibbles}.ip6.arpa`;
}
