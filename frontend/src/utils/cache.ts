// Sistema de cache para evitar requisições desnecessárias
// Dados do banco atualizam a cada 5 minutos

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos em milissegundos

  // Verifica se o cache é válido
  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    return (now - entry.timestamp) < this.CACHE_DURATION
  }

  // Busca dados do cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  // Armazena dados no cache
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  // Limpa cache de uma chave específica
  clear(key: string): void {
    this.cache.delete(key)
  }

  // Limpa todo o cache
  clearAll(): void {
    this.cache.clear()
  }

  // Limpa cache expirado
  clearExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key)
      }
    }
  }
}

// Instância global do cache
export const dataCache = new DataCache()

// Helper para fazer fetch com cache
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Gera chave do cache baseada na URL e método
  const method = options?.method || 'GET'
  const cacheKey = `${method}:${url}`

  // Tenta buscar do cache (apenas para GET)
  if (method === 'GET') {
    const cached = dataCache.get<T>(cacheKey)
    if (cached !== null) {
      console.log(`[Cache HIT] ${url}`)
      return cached
    }
  }

  // Busca do servidor
  console.log(`[Cache MISS] ${url}`)
  const response = await fetch(url, options)
  const data = await response.json()

  // Armazena no cache (apenas para GET)
  if (method === 'GET' && response.ok) {
    dataCache.set(cacheKey, data)
  }

  return data
}
