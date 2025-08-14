#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Cálculo de Financiamento na Planta - Implementação em Python
------------------------------------------------
Este módulo implementa o cálculo correto do financiamento na planta,
com foco específico no cálculo do saldo líquido conforme especificado.

Fórmula do Saldo Líquido:
- Mês 0 = Em branco (None)
- Mês 1 = Valor do imóvel - entrada - desconto
- Mês 2+ = Saldo líquido mês anterior - pagamento total líquido mês anterior
"""

import json
import datetime
from typing import List, Dict, Any, Optional, Union, Literal
from pydantic import BaseModel, field_validator, Field, model_validator


class ParcelaPersonalizada(BaseModel):
    """Modelo para parcelas personalizadas fornecidas pelo usuário"""
    mes: int
    valor: float
    tipo: Literal["Parcela", "Reforço", "Chaves"]
    
    @field_validator('mes')
    @classmethod
    def mes_valido(cls, v):
        assert v >= 0, "Mês deve ser maior ou igual a 0"
        return v
    
    @field_validator('valor')
    @classmethod
    def valor_valido(cls, v):
        assert v > 0, "Valor deve ser maior que 0"
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
    
    @model_validator(mode='after')
    def validar_tipo_parcelamento(self):
        """Valida que os campos específicos para cada tipo de parcelamento estão presentes"""
        if self.tipoParcelamento == 'personalizado' and not self.parcelasPersonalizadas:
            raise ValueError("É necessário fornecer parcelas personalizadas quando o tipo de parcelamento é 'personalizado'")
        
        if self.incluirReforco and (not self.periodicidadeReforco or not self.valorReforco):
            raise ValueError("Periodicidade e valor de reforço são obrigatórios quando incluirReforco é verdadeiro")
            
        return self


class Parcela(BaseModel):
    """Modelo para representar uma parcela no financiamento"""
    mes: int
    data: str
    tipoPagamento: Literal['Entrada', 'Parcela', 'Reforço', 'Chaves']
    valorBase: float
    percentualCorrecao: float
    valorCorrigido: float
    saldoDevedor: float
    saldoLiquido: Optional[float] = None
    correcaoAcumulada: float


class ResumoFinanciamento(BaseModel):
    """Modelo para o resumo do financiamento"""
    valorImovel: float
    valorEntrada: float
    valorFinanciado: float
    prazoEntrega: int
    prazoPagamento: int
    totalParcelas: int
    totalCorrecao: float
    percentualCorrecao: float
    valorTotal: float


class ResultadoFinanciamentoPlanta(BaseModel):
    """Modelo para o resultado do cálculo de financiamento na planta"""
    parcelas: List[Parcela]
    resumo: ResumoFinanciamento


def formatar_data(data_base: datetime.date, meses_adicionar: int) -> str:
    """Formata a data adicionando o número de meses especificado"""
    ano = data_base.year + (data_base.month + meses_adicionar - 1) // 12
    mes = (data_base.month + meses_adicionar - 1) % 12 + 1
    dia = min(data_base.day, [31, 29 if (ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0)) else 28, 
                              31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes-1])
    return f"{ano}-{mes:02d}-{dia:02d}"


def calcular_financiamento_planta(input_data: Union[Dict[str, Any], FinanciamentoPlantaInput]) -> Dict[str, Any]:
    """
    Calcula o financiamento na planta com base nos parâmetros de entrada.
    Implementação específica do cálculo correto do saldo líquido.
    
    Args:
        input_data: Dados de entrada para o cálculo do financiamento
    
    Returns:
        Resultados do cálculo do financiamento
    """
    # Converter para modelo se necessário
    if isinstance(input_data, dict):
        input_data = FinanciamentoPlantaInput(**input_data)
    
    print(f"Iniciando cálculo de financiamento na planta (v2-Python): {input_data.model_dump_json()}")
    print("*** DETALHAMENTO DOS CÁLCULOS PARA DEPURAÇÃO ***")
    
    # Extrair dados de entrada
    valor_imovel = input_data.valorImovel
    percentual_entrada = input_data.percentualEntrada
    valor_entrada = input_data.valorEntrada
    prazo_entrega = input_data.prazoEntrega
    prazo_pagamento = input_data.prazoPagamento
    correcao_mensal_ate_chaves = input_data.correcaoMensalAteChaves
    correcao_mensal_apos_chaves = input_data.correcaoMensalAposChaves
    tipo_parcelamento = input_data.tipoParcelamento
    incluir_reforco = input_data.incluirReforco
    periodicidade_reforco = input_data.periodicidadeReforco
    valor_reforco = input_data.valorReforco or 0
    valor_chaves = input_data.valorChaves or 0
    parcelas_personalizadas = input_data.parcelasPersonalizadas
    valor_desconto = input_data.desconto or 0
    
    print(f"Dados de entrada: valor_imovel={valor_imovel}, valor_entrada={valor_entrada}, valor_desconto={valor_desconto}")
    
    # Valor de entrada efetivo - usa o valor direto ou calcula com base no percentual
    valor_entrada_efetivo = round(valor_imovel * (percentual_entrada / 100), 2) if percentual_entrada else valor_entrada
    print(f"Valor entrada efetivo: {valor_entrada_efetivo}")
    
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
    print(f"Mês 0: saldoLiquido=None (em branco)")
    
    saldo_devedor_atual = valor_imovel - valor_entrada_efetivo
    
    # Calcular valor base das parcelas automaticamente
    if tipo_parcelamento == 'automatico':
        # Total a ser distribuído (menos entrada, reforços e chaves)
        valor_total_reforcos = 0
        meses_com_reforco = []
        
        if incluir_reforco and valor_reforco > 0:
            # Determinar meses com reforço baseado na periodicidade
            periodo = 0
            if periodicidade_reforco == 'trimestral':
                periodo = 3
            elif periodicidade_reforco == 'semestral':
                periodo = 6
            elif periodicidade_reforco == 'anual':
                periodo = 12
            
            if periodo > 0:
                meses_com_reforco = []
                for mes in range(periodo, prazo_pagamento + 1, periodo):
                    if mes <= prazo_entrega:
                        meses_com_reforco.append(mes)
                
                valor_total_reforcos = len(meses_com_reforco) * valor_reforco
        
        # Valor residual na entrega das chaves
        valor_chaves_efetivo = valor_chaves or 0
        
        # Valor total a ser distribuído nas parcelas mensais
        valor_distribuir = saldo_devedor_atual - valor_total_reforcos - valor_chaves_efetivo
        
        # Número de meses para distribuir (excluindo meses com reforço e chaves)
        meses_com_pagamentos = list(range(1, prazo_pagamento + 1))
        meses_com_chaves = [prazo_entrega] if valor_chaves_efetivo > 0 else []
        
        # Remover meses que já têm reforço ou chaves
        meses_parcelas_regulares = [mes for mes in meses_com_pagamentos 
                                    if mes not in meses_com_reforco and mes not in meses_com_chaves]
        
        # Valor de cada parcela mensal
        valor_parcela_mensal = valor_distribuir / len(meses_parcelas_regulares) if meses_parcelas_regulares else 0
        
        print("Detalhes do cálculo automático:", {
            "valorDistribuir": valor_distribuir,
            "mesesParcelasRegulares": len(meses_parcelas_regulares),
            "valorParcelaMensal": valor_parcela_mensal,
            "mesesComReforco": meses_com_reforco,
            "valorTotalReforcos": valor_total_reforcos,
            "valorChavesEfetivo": valor_chaves_efetivo
        })
        
        # Distribuir as parcelas mensais
        for mes in range(1, prazo_pagamento + 1):
            # Definir tipo e valor da parcela baseado na lógica
            tipo_pagamento = "Parcela"
            valor_base = valor_parcela_mensal
            
            # Verificar se é mês de reforço
            if incluir_reforco and valor_reforco > 0 and mes in meses_com_reforco:
                tipo_pagamento = "Reforço"
                valor_base = valor_reforco
            
            # Verificar se é mês de chaves
            if mes == prazo_entrega and valor_chaves_efetivo > 0:
                tipo_pagamento = "Chaves"
                valor_base = valor_chaves_efetivo
            
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
            
            # CÁLCULO DO SALDO LÍQUIDO USANDO A NOVA FÓRMULA CORRIGIDA:
            # Mês 1 = Valor do imóvel - entrada - desconto
            # Mês 2+ = Saldo líquido mês anterior - pagamento total líquido mês anterior
            saldo_liquido_atual = 0
            
            if mes == 1:
                # Mês 1: Valor do imóvel - entrada - desconto
                saldo_liquido_atual = valor_imovel - valor_entrada_efetivo - valor_desconto
                print(f"[FORMULA] Mês {mes}: SaldoLiquido = {valor_imovel} - {valor_entrada_efetivo} - {valor_desconto} = {saldo_liquido_atual}")
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
                    
                    print(f"[FORMULA] Mês {mes}: SaldoLiquido = {saldo_liquido_mes_anterior} - {pagamento_mes_anterior} = {saldo_liquido_atual}")
                else:
                    # Caso de contingência (não deveria acontecer)
                    print(f"[ALERTA] Mês {mes}: Não encontrou mês anterior {mes_anterior}, usando valor inicial")
                    saldo_liquido_atual = valor_imovel - valor_entrada_efetivo - valor_desconto
            
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
    
    elif tipo_parcelamento == 'personalizado' and parcelas_personalizadas:
        # Usar as parcelas personalizadas fornecidas pelo usuário
        print(f"Usando parcelas personalizadas: {json.dumps([p.model_dump() for p in parcelas_personalizadas])}")
        
        # Ordenar parcelas por mês
        parcelas_ordenadas = sorted(parcelas_personalizadas, key=lambda p: p.mes)
        
        for mes in range(1, prazo_pagamento + 1):
            # Procurar se há uma parcela personalizada para este mês
            parcela_personalizada = next((p for p in parcelas_ordenadas if p.mes == mes), None)
            
            # Se não há parcela para este mês, continue para o próximo
            if not parcela_personalizada:
                continue
            
            # Valor e tipo da parcela personalizada
            valor_base = parcela_personalizada.valor
            tipo_pagamento = parcela_personalizada.tipo
            
            # Calcular correção para o mês atual
            percentual_correcao = correcao_mensal_ate_chaves if mes <= prazo_entrega else correcao_mensal_apos_chaves
            
            # Atualizar saldo devedor com correção
            correcao_mensal = saldo_devedor_atual * (percentual_correcao / 100)
            saldo_devedor_atual += correcao_mensal
            
            # Calcular correção acumulada
            correcao_acumulada = percentual_correcao if mes == 1 else parcelas[-1]["correcaoAcumulada"] + percentual_correcao
            
            # Calcular valor corrigido da parcela
            valor_corrigido = valor_base * (1 + (correcao_acumulada / 100))
            
            # Atualizar saldo devedor após o pagamento
            saldo_devedor_atual -= valor_corrigido
            
            # CÁLCULO DO SALDO LÍQUIDO USANDO A NOVA FÓRMULA CORRIGIDA:
            saldo_liquido_atual = 0
            
            if mes == 1:
                # Mês 1: Valor do imóvel - entrada - desconto
                saldo_liquido_atual = valor_imovel - valor_entrada_efetivo - valor_desconto
                print(f"[FORMULA] Mês {mes}: SaldoLiquido = {valor_imovel} - {valor_entrada_efetivo} - {valor_desconto} = {saldo_liquido_atual}")
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
                    
                    print(f"[FORMULA] Mês {mes}: SaldoLiquido = {saldo_liquido_mes_anterior} - {pagamento_mes_anterior} = {saldo_liquido_atual}")
                else:
                    # Caso de contingência (não deveria acontecer)
                    print(f"[ALERTA] Mês {mes}: Não encontrou mês anterior {mes_anterior}, usando valor inicial")
                    saldo_liquido_atual = valor_imovel - valor_entrada_efetivo - valor_desconto
            
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
    
    # Calcular totais para o resumo
    total_correcao = sum(
        p["valorCorrigido"] - p["valorBase"] 
        for p in parcelas 
        if p["valorCorrigido"] > p["valorBase"]
    )
    
    valor_total = sum(p["valorCorrigido"] for p in parcelas)
    percentual_correcao = (total_correcao / (valor_total - total_correcao) * 100) if total_correcao > 0 and (valor_total - total_correcao) > 0 else 0
    
    resultado = {
        "parcelas": parcelas,
        "resumo": {
            "valorImovel": valor_imovel,
            "valorEntrada": valor_entrada_efetivo,
            "valorFinanciado": valor_imovel - valor_entrada_efetivo,
            "prazoEntrega": prazo_entrega,
            "prazoPagamento": prazo_pagamento,
            "totalParcelas": len(parcelas),
            "totalCorrecao": total_correcao,
            "percentualCorrecao": percentual_correcao,
            "valorTotal": valor_total
        }
    }
    
    print(f"Cálculo concluído. {len(parcelas)} parcelas geradas.")
    return resultado


if __name__ == "__main__":
    # Teste de cálculo
    dados_teste = {
        "valorImovel": 500000,
        "valorEntrada": 50000,
        "prazoEntrega": 36,
        "prazoPagamento": 36,
        "correcaoMensalAteChaves": 0.5,
        "correcaoMensalAposChaves": 0.5,
        "tipoParcelamento": "automatico",
        "incluirReforco": False,
        "desconto": 0
    }
    
    resultado = calcular_financiamento_planta(dados_teste)
    print(json.dumps(resultado, indent=2))