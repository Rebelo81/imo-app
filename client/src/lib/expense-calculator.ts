/**
 * Biblioteca de funções para cálculo de despesas de venda
 * Centraliza toda a lógica de cálculo das despesas, incluindo comissão, custos adicionais
 * e custos de manutenção para diferentes cenários
 */

/**
 * Calcula as despesas de venda, incluindo custos de manutenção específicos do cenário
 * @param projection Projeção com dados dos custos
 * @param valorVendaProjetada Valor de venda projetado
 * @param scenario Cenário (padrao, conservador, otimista)
 * @returns Objeto com valores calculados de despesas
 */
export function calcularDespesasVenda(
  projection: any,
  valorVendaProjetada: number,
  scenario: string
): { 
  comissaoVenda: number; 
  custosAdicionais: number; 
  outrosCustos: number; 
  total: number;
} {
  // Obter os percentuais de comissão e custos adicionais específicos do cenário selecionado
  let percentualComissao = 0;
  let percentualCustosAdicionais = 0;
  let outrosCustos = 0;
  
  // Registrar os valores disponíveis para debug
  console.log("DEBUG - Valores disponíveis para cálculo de despesas:", {
    comissao: {
      padrao: projection.padrao_venda_comissao,
      conservador: projection.conservador_venda_comissao,
      otimista: projection.otimista_venda_comissao
    },
    custosAdicionais: {
      padrao: projection.padrao_venda_custos_adicionais,
      conservador: projection.conservador_venda_custos_adicionais,
      otimista: projection.otimista_venda_custos_adicionais
    },
    custosManutencao: {
      padrao: projection.padrao_venda_custos_manutencao,
      conservador: projection.conservador_venda_custos_manutencao,
      otimista: projection.otimista_venda_custos_manutencao
    },
    scenario: scenario,
    projection_id: projection.id
  });
  
  // Buscar valores conforme o cenário selecionado
  if (scenario === 'padrao') {
    percentualComissao = parseFloat(projection.padrao_venda_comissao || '6') / 100;
    percentualCustosAdicionais = parseFloat(projection.padrao_venda_custos_adicionais || '2') / 100;
    outrosCustos = parseFloat(projection.padrao_venda_custos_manutencao || '0');
  } else if (scenario === 'conservador') {
    percentualComissao = parseFloat(projection.conservador_venda_comissao || '6') / 100;
    percentualCustosAdicionais = parseFloat(projection.conservador_venda_custos_adicionais || '2') / 100;
    outrosCustos = parseFloat(projection.conservador_venda_custos_manutencao || '0');
  } else if (scenario === 'otimista') {
    percentualComissao = parseFloat(projection.otimista_venda_comissao || '6') / 100;
    percentualCustosAdicionais = parseFloat(projection.otimista_venda_custos_adicionais || '2') / 100;
    outrosCustos = parseFloat(projection.otimista_venda_custos_manutencao || '0');
  }
  
  // Calcular os valores com base nos percentuais dinâmicos
  const comissaoVenda = valorVendaProjetada * percentualComissao;
  const custosAdicionais = valorVendaProjetada * percentualCustosAdicionais;
  
  console.log("DEBUG - Percentuais aplicados para cenário " + scenario + ":", {
    comissao: (percentualComissao * 100).toFixed(2) + "%",
    custosAdicionais: (percentualCustosAdicionais * 100).toFixed(2) + "%",
    outrosCustos: outrosCustos
  });
  
  console.log("Despesas de venda calculadas:", {
    valorVendaProjetada,
    percentualComissao: (percentualComissao * 100).toFixed(2) + "%",
    comissaoVenda,
    percentualCustosAdicionais: (percentualCustosAdicionais * 100).toFixed(2) + "%", 
    custosAdicionais,
    outrosCustos,
    total: comissaoVenda + custosAdicionais + outrosCustos,
    cenario: scenario
  });
  
  // Retorna objeto com os componentes individuais e o total
  return {
    comissaoVenda,
    custosAdicionais,
    outrosCustos,
    total: comissaoVenda + custosAdicionais + outrosCustos
  };
}