#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
API para o cálculo de financiamento na planta - Implementação em Python
-----------------------------------------------------------------------
Este módulo fornece uma API REST para o cálculo de financiamento na planta,
implementando corretamente o cálculo do saldo líquido.
"""

import os
import sys
import json
from flask import Flask, request, jsonify
from financiamento_planta_corrigido import calcular_financiamento_planta

app = Flask(__name__)

@app.route('/api/calcular-financiamento', methods=['POST'])
def api_calcular_financiamento():
    """Endpoint para calcular financiamento na planta"""
    try:
        # Obter dados JSON da requisição
        dados = request.get_json()
        
        if not dados:
            return jsonify({"error": "Dados de entrada não fornecidos"}), 400
        
        # Processar o cálculo
        resultado = calcular_financiamento_planta(dados)
        
        # Retornar resultado como JSON
        return jsonify(resultado)
    
    except Exception as e:
        app.logger.error(f"Erro no cálculo: {str(e)}")
        return jsonify({"error": f"Erro no cálculo: {str(e)}"}), 500


# Configurar CORS para permitir chamadas do frontend
@app.after_request
def add_cors_headers(response):
    """Adicionar cabeçalhos CORS para permitir chamadas do frontend"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


if __name__ == '__main__':
    # Determinar porta (usar variável de ambiente PORT ou padrão 5001)
    porta = int(os.environ.get('PYTHON_API_PORT', 5001))
    
    print(f"Iniciando serviço Python na porta {porta}...")
    app.run(host='0.0.0.0', port=porta, debug=True)