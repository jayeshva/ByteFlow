const blacklist = new Set<string>();

export const blacklistToken = (token: string) => blacklist.add(token);
export const isBlacklisted = (token: string) => blacklist.has(token);
