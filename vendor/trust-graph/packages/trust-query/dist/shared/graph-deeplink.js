/** Stable node id for a trust subject (matches heap Graph View ids). */
export function subjectNodeId(subject) {
    return `${subject.type}:${subject.value}`;
}
/** Parse a graph node id back into a TrustSubject when possible. */
export function parseNodeId(nodeId) {
    const colon = nodeId.indexOf(':');
    if (colon <= 0)
        return undefined;
    const type = nodeId.slice(0, colon);
    const value = nodeId.slice(colon + 1);
    if ((type === 'p' || type === 'e' || type === 'i') && value) {
        return { type, value };
    }
    return undefined;
}
