export function blobToGuidString(blob: any): string {
    // Convert blob to hex string
    const hex = Buffer.from(blob).toString('hex').toUpperCase();
    // Format as GUID (8-4-4-4-12)
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function guidStringToBuffer(guid: string): Buffer {
    return Buffer.from(guid.replace(/-/g, ''), 'hex');
}
