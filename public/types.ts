export type FetchFunc = <T>(input: string, body?: {}, init?: RequestInit) => Promise<T>
