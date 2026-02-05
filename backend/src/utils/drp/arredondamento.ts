/**
 * Arredonda um valor para o múltiplo configurado
 * 
 * @param valor - Valor a ser arredondado
 * @param multiplo - Múltiplo de venda (ex: 6, 12, 24)
 * @returns Valor arredondado para cima no múltiplo
 * 
 * @example
 * arredondarMultiplo(7, 6)   // 12
 * arredondarMultiplo(15, 12) // 24
 * arredondarMultiplo(10, 1)  // 10 (sem arredondamento)
 */
export function arredondarMultiplo(valor: number, multiplo: number): number {
  if (multiplo <= 1) return Math.round(valor)
  return Math.ceil(valor / multiplo) * multiplo
}

/**
 * Distribui o restante de uma alocação (devido a arredondamentos)
 * para as filiais com maior fração perdida
 * 
 * @param alocacoes - Array de alocações com valor exato e fração
 * @param restante - Quantidade restante a distribuir
 * @param prioridadeFiliais - Ordem de prioridade das filiais (para desempate)
 * @returns void (modifica o array de alocações diretamente)
 */
export function distribuirRestante<T extends { filial: { cod_filial: string; alocacao_sugerida: number }; valorExato: number; fracao: number }>(
  alocacoes: T[],
  restante: number,
  prioridadeFiliais: string[]
): void {
  // Ordenar por fração decrescente (quem mais "perdeu" no arredondamento)
  alocacoes.sort((a, b) => {
    const diferencaFracao = b.fracao - a.fracao
    if (Math.abs(diferencaFracao) < 0.0001) {
      // Empate: usar prioridade de filial
      const prioA = prioridadeFiliais.indexOf(a.filial.cod_filial)
      const prioB = prioridadeFiliais.indexOf(b.filial.cod_filial)
      return prioA - prioB
    }
    return diferencaFracao
  })

  // Distribuir o restante
  for (let i = 0; i < restante && i < alocacoes.length; i++) {
    alocacoes[i].filial.alocacao_sugerida += 1
  }
}
