export function getQueryParams(params: object): string {
    const paramEntries = Object.entries(params).filter(([, value]) => value)
    if (paramEntries.length === 0) return ''
    return '?' + paramEntries.map(paramEntry => paramEntry.join('=')).join('&')
  }
