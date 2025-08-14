/**
 * Calcula a TIR (Taxa Interna de Retorno) baseado no modelo do Excel
 * usando a API do servidor para um cálculo preciso e consistente
 * 
 * @param projectionId ID da projeção
 * @param scenario Cenário (padrao, conservador, otimista)
 * @returns Taxa Interna de Retorno mensal em formato decimal (ex: 0.0141 para 1,41% ao mês)
 */
export async function calcularTIRExcel(projectionId: number, scenario: string = 'padrao'): Promise<number> {
  if (!projectionId) {
    console.error("calcularTIRExcel: ID da projeção não informado");
    return 0;
  }

  try {
    // Adaptar o cenário do parâmetro para o formato do banco
    let scenarioAdaptado = scenario;
    if (scenario === 'realistic') scenarioAdaptado = 'padrao';
    if (scenario === 'conservative') scenarioAdaptado = 'conservador';
    if (scenario === 'optimistic') scenarioAdaptado = 'otimista';

    console.log("calcularTIRExcel: Iniciando cálculo", { projectionId, scenario: scenarioAdaptado });

    // Fazer a chamada à API para calcular a TIR
    const response = await fetch(`/api/tir/calcular?projectionId=${projectionId}&scenario=${scenarioAdaptado}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao calcular TIR: ${errorData.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log("calcularTIRExcel: Resultado obtido da API", result);
    
    // Retornar a TIR mensal
    return result.tirMensal;
    
  } catch (error) {
    console.error("calcularTIRExcel: Erro ao calcular TIR", error);
    return 0;
  }
}