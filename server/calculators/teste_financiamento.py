#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Teste do cálculo de financiamento na planta - Versão corrigida
-----------------------------------------------------------------------
Este módulo testa a implementação correta do cálculo do saldo líquido.
"""

import sys
import json
import datetime
from typing import Dict, Any, List, Optional, Union, Literal
from pydantic import BaseModel, Field, validator

# Modelo para dados de entrada
class ParcelaPersonalizada(BaseModel):
    """Modelo para parcelas personalizadas fornecidas pelo usuário"""
    mes: int
    valor: float
    tipo: Literal["Parcela", "Reforço", "Chaves"]

    @validator('mes')
    def mes_valido(cls, v):
        """Validar que o mês é positivo"""
        if v <= 0:
            raise ValueError("Mês deve ser maior que zero")
        return v
    
    @validator('valor')
    def valor_valido(cls, v):
        """Validar que o valor é positivo"""
        if v <= 0:
            raise ValueError("Valor deve ser maior que zero")
        return v

class FinanciamentoPlantaInput(BaseModel):
    """Modelo de entrada para o cálculo de financiamento na planta"""
    valorImovel: float = Field(..., gt=0)
    valorEntrada: float = Field(..., ge=0)
    percentualEntrada: Optional[float] = Field(None, ge=0)
    desconto: Optional[float] = Field(0, ge=0)
    prazoEntrega: int = Field(..., gt=0)
    prazoPagamento: int = Field(..., gt=0)
    correcaoMensalAteChaves: float = Field(..., ge=0)
    correcaoMensalAposChaves: float = Field(..., ge=0)
    tipoParcelamento: Literal['automatico', 'personalizado'] = 'automatico'
    incluirReforco: bool = False
    periodicidadeReforco: Optional[Literal['trimestral', 'semestral', 'anual']] = None
    valorReforco: Optional[float] = Field(None, ge=0)
    valorChaves: Optional[float] = Field(None, ge=0)
    parcelasPersonalizadas: Optional[List[ParcelaPersonalizada]] = None

def formatar_data(data_base: datetime.date, meses_adicionar: int) -> str:
    """Formata a data adicionando o número de meses especificado"""
    if meses_adicionar == 0:
        return data_base.strftime("%Y-%m-%d")
    
    ano = data_base.year + ((data_base.month + meses_adicionar - 1) // 12)
    mes = ((data_base.month + meses_adicionar - 1) % 12) + 1
    dia = min(data_base.day, [31, 29 if (ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0)) else 28, 
                              31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes-1])
    return f"{ano}-{mes:02d}-{dia:02d}"


def calcular_financiamento_planta_teste():
    """
    Teste específico para o cálculo correto do saldo líquido.
    """
    # Dados de teste simplificados
    dados_teste = {
        "valorImovel": 500000,
        "valorEntrada": 50000,
        "desconto": 10000,  # Um desconto de 10.000
        "prazoEntrega": 36,
        "prazoPagamento": 36,
        "correcaoMensalAteChaves": 0.5,  # 0.5% ao mês
        "correcaoMensalAposChaves": 0.5,
        "tipoParcelamento": "automatico",
        "incluirReforco": False
    }
    
    input_data = FinanciamentoPlantaInput(**dados_teste)
    print(f"Iniciando teste com dados: {json.dumps(dados_teste, indent=2)}")
    
    # Extrair dados de entrada
    valor_imovel = input_data.valorImovel
    percentual_entrada = input_data.percentualEntrada
    valor_entrada = input_data.valorEntrada
    prazo_entrega = input_data.prazoEntrega
    prazo_pagamento = input_data.prazoPagamento
    correcao_mensal_ate_chaves = input_data.correcaoMensalAteChaves
    correcao_mensal_apos_chaves = input_data.correcaoMensalAposChaves
    valor_desconto = input_data.desconto or 0
    
    # Valor de entrada efetivo
    valor_entrada_efetivo = round(valor_imovel * (percentual_entrada / 100), 2) if percentual_entrada else valor_entrada
    
    parcelas = []
    data_base = datetime.date.today()
    
    # Para o mês 0 não há saldo líquido (ou é nulo)
    parcelas.append({
        "mes": 0,
        "data": formatar_data(data_base, 0),
        "tipoPagamento": "Entrada",
        "valorBase": valor_entrada_efetivo,
        "percentualCorrecao": 0,
        "valorCorrigido": valor_entrada_efetivo,
        "saldoDevedor": valor_imovel - valor_entrada_efetivo,
        "saldoLiquido": None,  # Mês 0: saldo líquido em branco (None)
        "correcaoAcumulada": 0
    })
    
    # Verificar o mês 0
    print(f"Mês 0: saldoLiquido = {parcelas[0]['saldoLiquido']} (deve ser None/null)")
    
    saldo_devedor_atual = valor_imovel - valor_entrada_efetivo
    
    # Valor total a ser distribuído nas parcelas mensais (simplificado)
    valor_parcela_mensal = saldo_devedor_atual / (prazo_pagamento)
    
    # Gerar parcelas para testar o cálculo do saldo líquido
    for mes in range(1, prazo_pagamento + 1):
        # Definir tipo e valor da parcela baseado na lógica
        tipo_pagamento = "Parcela"
        valor_base = valor_parcela_mensal
        
        # Calcular correção para o mês atual
        percentual_correcao = correcao_mensal_ate_chaves if mes <= prazo_entrega else correcao_mensal_apos_chaves
        
        # Atualizar saldo devedor com correção
        correcao_mensal = saldo_devedor_atual * (percentual_correcao / 100)
        saldo_devedor_atual += correcao_mensal
        
        # Calcular valor corrigido da parcela - aplica correção acumulada até o momento
        correcao_acumulada = percentual_correcao if mes == 1 else parcelas[mes - 1]["correcaoAcumulada"] + percentual_correcao
        
        valor_corrigido = valor_base * (1 + (correcao_acumulada / 100))
        
        # Atualizar saldo devedor após o pagamento
        saldo_devedor_atual -= valor_corrigido
        
        # CÁLCULO DO SALDO LÍQUIDO COM A FÓRMULA CORRIGIDA:
        saldo_liquido_atual = 0
        
        if mes == 1:
            # Mês 1: Valor do imóvel - entrada - desconto
            saldo_liquido_atual = valor_imovel - valor_entrada_efetivo - valor_desconto
            print(f"Mês {mes}: saldoLiquido = {saldo_liquido_atual} (deve ser valorImovel - entrada - desconto = {valor_imovel} - {valor_entrada_efetivo} - {valor_desconto} = {valor_imovel - valor_entrada_efetivo - valor_desconto})")
        else:
            # Para mês 2 em diante: Saldo líquido mês anterior - pagamento mês anterior
            mes_anterior = mes - 1
            parcela_anterior = next((p for p in parcelas if p["mes"] == mes_anterior), None)
            
            if parcela_anterior:
                # Obter o saldo líquido do mês anterior
                saldo_liquido_mes_anterior = parcela_anterior["saldoLiquido"]
                
                # Obter o pagamento do mês anterior (valorCorrigido, NÃO o valorBase)
                pagamento_mes_anterior = parcela_anterior["valorCorrigido"]
                
                # Calcular o novo saldo líquido
                saldo_liquido_atual = saldo_liquido_mes_anterior - pagamento_mes_anterior if saldo_liquido_mes_anterior is not None else None
                
                print(f"Mês {mes}: saldoLiquido = {saldo_liquido_atual} (deve ser saldoLiquidoAnterior - pagamentoAnterior = {saldo_liquido_mes_anterior} - {pagamento_mes_anterior} = {saldo_liquido_mes_anterior - pagamento_mes_anterior if saldo_liquido_mes_anterior is not None else None})")
                
                # Verificação extra para garantir que estamos usando o valor corrigido:
                if parcela_anterior["valorCorrigido"] != parcela_anterior["valorBase"]:
                    print(f"  VERIFICAÇÃO: valorBase={parcela_anterior['valorBase']} ≠ valorCorrigido={parcela_anterior['valorCorrigido']}")
            else:
                print(f"ERRO: Mês {mes}: Não encontrou mês anterior {mes_anterior}")
                saldo_liquido_atual = None
        
        # Adicionar parcela
        parcelas.append({
            "mes": mes,
            "data": formatar_data(data_base, mes),
            "tipoPagamento": tipo_pagamento,
            "valorBase": valor_base,
            "percentualCorrecao": percentual_correcao,
            "valorCorrigido": valor_corrigido,
            "saldoDevedor": saldo_devedor_atual,
            "saldoLiquido": saldo_liquido_atual,
            "correcaoAcumulada": correcao_acumulada
        })
    
    # Imprimir a tabela completa para verificação
    print("\nTABELA COMPLETA:")
    print("| Mês | Valor Base | Valor Corrigido | Saldo Devedor | Saldo Líquido |")
    print("|-----|------------|-----------------|---------------|---------------|")
    
    for p in parcelas:
        print(f"| {p['mes']:3} | {p['valorBase']:10.2f} | {p['valorCorrigido']:15.2f} | {p['saldoDevedor']:13.2f} | {p['saldoLiquido'] if p['saldoLiquido'] is not None else 'None':13} |")

    print("\nTeste concluído!")


if __name__ == "__main__":
    print("Iniciando teste do cálculo de financiamento na planta")
    calcular_financiamento_planta_teste()