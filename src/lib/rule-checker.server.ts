/**
 * Deterministic rule checker (server-only).
 *
 * This module is the TypeScript implementation of the rule-check API.
 * `runRuleChecks` always runs these local deterministic checks; there is no
 * external/Python rule-checker service.
 *
 * Contract (per check):
 *   { check: string, status: "PASS" | "FAIL" | "WARNING", evidence: string, explanation: string }
 */
import type { RuleCheckResult } from "./netsage";

export type CheckerInput = {
  show_output: string;
  device_info: string;
  topology: string;
};

const VALID_MASKS = new Set([
  "255.0.0.0",
  "255.128.0.0",
  "255.192.0.0",
  "255.224.0.0",
  "255.240.0.0",
  "255.248.0.0",
  "255.252.0.0",
  "255.254.0.0",
  "255.255.0.0",
  "255.255.128.0",
  "255.255.192.0",
  "255.255.224.0",
  "255.255.240.0",
  "255.255.248.0",
  "255.255.252.0",
  "255.255.254.0",
  "255.255.255.0",
  "255.255.255.128",
  "255.255.255.192",
  "255.255.255.224",
  "255.255.255.240",
  "255.255.255.248",
  "255.255.255.252",
]);

const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function maskToPrefix(mask: string): number {
  return mask
    .split(".")
    .map((o) => Number(o).toString(2).padStart(8, "0"))
    .join("")
    .split("")
    .filter((b) => b === "1").length;
}

function sameNetwork(a: string, b: string, prefix: number): boolean {
  const toInt = (ip: string) => ip.split(".").reduce((acc, o) => acc * 256 + Number(o), 0);
  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return ((toInt(a) & maskInt) >>> 0) === ((toInt(b) & maskInt) >>> 0);
}

function pass(check: string, explanation: string, evidence = ""): RuleCheckResult {
  return { check, status: "PASS", evidence, explanation };
}

// ---------- individual checks ----------

function checkDuplicateIp(text: string): RuleCheckResult {
  const counts = new Map<string, number>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (/mask|gateway|dns|network|wildcard/i.test(line)) continue;
    for (const ip of line.match(IPV4) ?? []) {
      if (!isIpv4(ip) || ip.startsWith("255.")) continue;
      counts.set(ip, (counts.get(ip) ?? 0) + 1);
    }
  }
  const duplicates = [...counts.entries()].filter(([, n]) => n > 1).map(([ip, n]) => `${ip} (x${n})`);
  if (duplicates.length === 0) {
    return pass("Duplicate IP addresses", "No host address appears more than once in the supplied output.");
  }
  return {
    check: "Duplicate IP addresses",
    status: "FAIL",
    evidence: duplicates.join(", "),
    explanation:
      "The same host address is assigned more than once in the supplied output. Duplicate addresses cause ARP conflicts and intermittent loss of connectivity.",
  };
}

function checkSubnetMasks(text: string): RuleCheckResult {
  const masks = [...text.matchAll(/(?:mask|netmask)\D{0,12}((?:\d{1,3}\.){3}\d{1,3})/gi)].map((m) => m[1]!);
  if (masks.length === 0) {
    return {
      check: "Subnet mask validity",
      status: "WARNING",
      evidence: "",
      explanation: "No subnet mask was found in the supplied output, so this check could not be evaluated.",
    };
  }
  const invalid = masks.filter((m) => !VALID_MASKS.has(m));
  if (invalid.length > 0) {
    return {
      check: "Subnet mask validity",
      status: "FAIL",
      evidence: invalid.join(", "),
      explanation: "One or more masks are not valid contiguous IPv4 subnet masks.",
    };
  }
  const unique = [...new Set(masks)];
  if (unique.length > 1) {
    return {
      check: "Subnet mask validity",
      status: "WARNING",
      evidence: unique.join(", "),
      explanation:
        "Different masks were found in the same output. Verify that hosts on one segment share an identical mask; mismatched masks break local delivery.",
    };
  }
  return pass("Subnet mask validity", `All masks are valid and consistent (${unique[0]}).`, unique.join(", "));
}

function checkGatewayMismatch(text: string): RuleCheckResult {
  const gateways = [...text.matchAll(/gateway\D{0,12}((?:\d{1,3}\.){3}\d{1,3})/gi)].map((m) => m[1]!);
  const maskMatch = text.match(/(?:mask|netmask)\D{0,12}((?:\d{1,3}\.){3}\d{1,3})/i);
  const hostIps = [...text.matchAll(/ip\s*address\D{0,12}((?:\d{1,3}\.){3}\d{1,3})/gi)].map((m) => m[1]!);

  if (gateways.length === 0) {
    return {
      check: "Gateway mismatch",
      status: "WARNING",
      evidence: "",
      explanation: "No default gateway was found in the supplied output, so this check could not be evaluated.",
    };
  }

  const uniqueGateways = [...new Set(gateways)];
  const routerIps = [
    ...text.matchAll(/^\s*(?:Gigabit|Fast|Ethernet|Serial|Vlan)\S*\s+((?:\d{1,3}\.){3}\d{1,3})/gim),
  ].map((m) => m[1]!);

  if (routerIps.length > 0 && !uniqueGateways.some((g) => routerIps.includes(g))) {
    return {
      check: "Gateway mismatch",
      status: "FAIL",
      evidence: `Host gateway: ${uniqueGateways.join(", ")} | Router interfaces: ${[...new Set(routerIps)].join(", ")}`,
      explanation:
        "The default gateway configured on the host does not match any router interface address present in the output. Traffic leaving the subnet has no valid next hop.",
    };
  }

  if (maskMatch && hostIps.length > 0) {
    const prefix = maskToPrefix(maskMatch[1]!);
    const offSubnet = uniqueGateways.filter((g) => !hostIps.some((ip) => sameNetwork(ip, g, prefix)));
    if (offSubnet.length > 0) {
      return {
        check: "Gateway mismatch",
        status: "FAIL",
        evidence: `Gateway ${offSubnet.join(", ")} with host ${hostIps.join(", ")}/${prefix}`,
        explanation: "The default gateway is outside the host subnet, so the host cannot ARP for it.",
      };
    }
  }

  return pass("Gateway mismatch", "The default gateway is consistent with the host subnet and router addressing.", uniqueGateways.join(", "));
}

function checkInterfaceDown(text: string): RuleCheckResult {
  const lines = text.split(/\r?\n/);
  const down = lines.filter(
    (l) => /administratively down/i.test(l) || /\bdown\s+down\b/i.test(l) || /\bnotconnect\b/i.test(l),
  );
  if (down.length === 0) {
    if (!/interface|show ip int|status/i.test(text)) {
      return {
        check: "Interface state",
        status: "WARNING",
        evidence: "",
        explanation: "No interface status output was supplied, so interface state could not be verified.",
      };
    }
    return pass("Interface state", "No interface is reported down in the supplied output.");
  }
  return {
    check: "Interface state",
    status: "FAIL",
    evidence: down.map((l) => l.trim()).join(" | "),
    explanation:
      "At least one interface is down. 'administratively down' means the port is shut down in configuration; 'down/down' points at a Layer 1 or cabling problem.",
  };
}

function checkMissingVlan(input: CheckerInput): RuleCheckResult {
  const combined = `${input.device_info}\n${input.show_output}`;
  const referenced = new Set(
    [...combined.matchAll(/(?:access\s+)?vlan\s+(\d{1,4})/gi)].map((m) => m[1]!).filter((v) => v !== "1"),
  );
  const vlanTable = input.show_output.match(/show vlan[\s\S]*/i)?.[0] ?? "";
  if (!vlanTable) {
    return {
      check: "Missing VLAN",
      status: "WARNING",
      evidence: "",
      explanation: "No 'show vlan brief' output was supplied, so the VLAN database could not be verified.",
    };
  }
  const defined = new Set([...vlanTable.matchAll(/^\s*(\d{1,4})\s+\S+\s+(?:active|suspended)/gim)].map((m) => m[1]!));
  const missing = [...referenced].filter((v) => !defined.has(v));
  if (missing.length > 0) {
    return {
      check: "Missing VLAN",
      status: "FAIL",
      evidence: `Referenced: ${[...referenced].join(", ") || "none"} | Defined: ${[...defined].join(", ") || "none"}`,
      explanation: `VLAN ${missing.join(", ")} is referenced by configuration or topology notes but does not exist in the VLAN database. Ports assigned to a non-existent VLAN are inactive.`,
    };
  }
  return pass("Missing VLAN", "Every referenced VLAN exists in the VLAN database.", `Defined: ${[...defined].join(", ")}`);
}

function checkMissingRoutes(text: string): RuleCheckResult {
  const routeTable = text.match(/show ip route[\s\S]*/i)?.[0] ?? "";
  if (!routeTable) {
    return {
      check: "Missing routes",
      status: "WARNING",
      evidence: "",
      explanation: "No 'show ip route' output was supplied, so the routing table could not be verified.",
    };
  }
  const connected = [...routeTable.matchAll(/^\s*C\s+/gim)].length;
  const learned = [...routeTable.matchAll(/^\s*(?:S|O|D|R|B|i|L1|L2)\s+/gim)].length;
  const hasDefault = /0\.0\.0\.0\/0|gateway of last resort is (?!not set)/i.test(routeTable);

  if (learned === 0 && !hasDefault) {
    return {
      check: "Missing routes",
      status: "FAIL",
      evidence: `${connected} connected route(s), 0 static/dynamic route(s), no default route`,
      explanation:
        "The routing table only contains directly connected networks. Any remote destination is unreachable until a static route, a routing protocol, or a default route is added.",
    };
  }
  if (!hasDefault) {
    return {
      check: "Missing routes",
      status: "WARNING",
      evidence: `${connected} connected, ${learned} static/dynamic, no gateway of last resort`,
      explanation: "No default route is present. Destinations outside the listed prefixes will be dropped.",
    };
  }
  return pass("Missing routes", "The routing table contains remote routes and a gateway of last resort.");
}

/** Run every local deterministic check. Exported so checks stay unit-testable. */
export function runLocalChecks(input: CheckerInput): RuleCheckResult[] {
  const text = `${input.show_output}\n${input.device_info}`;
  return [
    checkDuplicateIp(text),
    checkSubnetMasks(text),
    checkGatewayMismatch(text),
    checkInterfaceDown(input.show_output),
    checkMissingVlan(input),
    checkMissingRoutes(input.show_output),
  ];
}

export type CheckerRun = {
  engine: "typescript";
  results: RuleCheckResult[];
};

/**
 * Runs the deterministic checks using the local TypeScript implementation.
 */
export async function runRuleChecks(input: CheckerInput): Promise<CheckerRun> {
  return {
    engine: "typescript",
    results: runLocalChecks(input),
  };
}
