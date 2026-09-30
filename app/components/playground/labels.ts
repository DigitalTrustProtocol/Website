import type { Scenario, SubjectKey } from './engine';

/** Display name for a corpus placeholder: `alice` → `Alice`, `p` → `P`. */
function displayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Readable label for a pubkey or a subject key of the scenario. */
export function labelFor(scenario: Scenario, keyOrPubkey: string, xAccount: (id: string) => string): string {
  const value = /^[pei]:/.test(keyOrPubkey) ? keyOrPubkey.slice(2) : keyOrPubkey;
  const name = scenario.names[value];
  if (name) return displayName(name);
  if (value.startsWith('user:id:')) return xAccount(value.slice('user:id:'.length));
  return /^[0-9a-f]{64}$/.test(value) ? `${value.slice(0, 8)}…` : value;
}

/** Every pubkey the scenario mentions (authors, `p` subjects, hints, claims, own evidence). */
export function scenarioPubkeys(scenario: Scenario): string[] {
  const keys = new Set<string>();
  for (const record of scenario.records) {
    keys.add(record.pubkey);
    if (record.subjectType === 'p') keys.add(record.subject);
    if (record.hintPubkey) keys.add(record.hintPubkey);
  }
  for (const claim of scenario.claims) keys.add(claim.pubkey);
  for (const evidence of scenario.ownEvidence) {
    keys.add(evidence.root);
    keys.add(evidence.pubkey);
  }
  return [...keys];
}

/** Every subject key a trust question can ask about. */
export function scenarioSubjects(scenario: Scenario): SubjectKey[] {
  const keys = new Set<SubjectKey>(scenarioPubkeys(scenario).map((pubkey) => `p:${pubkey}`));
  for (const record of scenario.records) keys.add(`${record.subjectType}:${record.subject}`);
  for (const claim of scenario.claims) keys.add(`i:user:id:${claim.twitterId}`);
  for (const evidence of scenario.ownEvidence) keys.add(`i:${evidence.iKey}`);
  return [...keys];
}
