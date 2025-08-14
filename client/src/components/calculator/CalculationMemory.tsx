import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

export function CalculationMemory() {
  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>Memória de Cálculo - Financiamento na Planta</CardTitle>
        <CardDescription>
          Fórmulas utilizadas para os cálculos do financiamento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Glossário de Termos</h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">VI</TableCell>
                  <TableCell>Valor do Imóvel</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">VE</TableCell>
                  <TableCell>Valor da Entrada</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">TC<sub>mes</sub></TableCell>
                  <TableCell>Taxa de Correção do mês específico (ex: 1% = 0,01)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">TCA<sub>mes</sub></TableCell>
                  <TableCell>Taxa de Correção Acumulada do mês específico (ex: 1,01%, 2,01%, etc.)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">PTL<sub>mes</sub></TableCell>
                  <TableCell>Pagamento Total Líquido do mês (soma dos valores base sem correção)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">PT<sub>mes</sub></TableCell>
                  <TableCell>Pagamento Total do mês (soma dos valores corrigidos)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">SL<sub>mes</sub></TableCell>
                  <TableCell>Saldo Líquido no mês específico</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">SC<sub>mes</sub></TableCell>
                  <TableCell>Saldo Corrigido no mês específico</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium">Fórmulas para Cálculo do Saldo Líquido</h3>
            <div className="p-4 bg-gray-50 rounded-md space-y-4">
              <div>
                <p className="font-medium">Mês 0:</p>
                <p className="ml-4 text-gray-700">SL<sub>0</sub> = VI - VE</p>
                <p className="ml-4 mt-1 text-sm text-gray-500">O saldo líquido no mês 0 é o valor do imóvel menos o valor da entrada.</p>
              </div>
              
              <div>
                <p className="font-medium">Mês 1:</p>
                <p className="ml-4 text-gray-700">SL<sub>1</sub> = SL<sub>0</sub></p>
                <p className="ml-4 mt-1 text-sm text-gray-500">O saldo líquido no mês 1 é igual ao saldo líquido do mês 0 (não se subtrai o pagamento do mês 0, pois este foi a entrada).</p>
              </div>
              
              <div>
                <p className="font-medium">Mês 2 e seguintes:</p>
                <p className="ml-4 text-gray-700">SL<sub>m+1</sub> = SL<sub>m</sub> - PTL<sub>m</sub></p>
                <p className="ml-4 mt-1 text-sm text-gray-500">
                  O saldo líquido no mês m+1 é igual ao saldo líquido do mês m menos 
                  o pagamento total líquido do mês m.
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium">Fórmulas para Cálculo do Saldo Devedor Corrigido</h3>
            <div className="p-4 bg-gray-50 rounded-md space-y-4">
              <div>
                <p className="font-medium">Mês 0:</p>
                <p className="ml-4 text-gray-700">SC<sub>0</sub> = - (em branco)</p>
                <p className="ml-4 mt-1 text-sm text-gray-500">O saldo corrigido no mês 0 não é calculado (deixa-se em branco).</p>
              </div>
              
              <div>
                <p className="font-medium">Mês 1 e seguintes:</p>
                <p className="ml-4 text-gray-700">SC<sub>m</sub> = SL<sub>m</sub> × (1 + TCA<sub>m</sub> / 100)</p>
                <p className="ml-4 mt-1 text-sm text-gray-500">
                  O saldo devedor corrigido no mês m é o saldo líquido do mesmo mês multiplicado por 1 mais a taxa de 
                  correção acumulada daquele mês (convertida de percentual para decimal).
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium">Fórmulas para Cálculo do Pagamento</h3>
            <div className="p-4 bg-gray-50 rounded-md space-y-4">
              <div>
                <p className="font-medium">Pagamento Total Líquido:</p>
                <p className="ml-4 text-gray-700">PTL<sub>n</sub> = Parcela Base + Reforço Base + Chaves Base</p>
                <p className="ml-4 mt-1 text-sm text-gray-500">
                  O pagamento total líquido no mês n é a soma de todos os pagamentos base daquele mês 
                  (parcela, reforço, chaves), sem aplicar correção.
                </p>
              </div>
              
              <div>
                <p className="font-medium">Parcela Corrigida:</p>
                <p className="ml-4 text-gray-700">Parcela Corrigida<sub>n</sub> = Parcela Base × (1 + TCA<sub>n</sub>)</p>
                <p className="ml-4 mt-1 text-sm text-gray-500">
                  A parcela corrigida no mês n é a parcela base multiplicada por 1 mais a taxa 
                  de correção acumulada daquele mês.
                </p>
              </div>
              
              <div>
                <p className="font-medium">Reforço Corrigido:</p>
                <p className="ml-4 text-gray-700">Reforço Corrigido<sub>n</sub> = Reforço Base × (1 + TCA<sub>n</sub>)</p>
                <p className="ml-4 mt-1 text-sm text-gray-500">
                  O reforço corrigido no mês n é o reforço base multiplicado por 1 mais a taxa 
                  de correção acumulada daquele mês.
                </p>
              </div>
              
              <div>
                <p className="font-medium">Chaves Corrigido:</p>
                <p className="ml-4 text-gray-700">Chaves Corrigido<sub>n</sub> = Chaves Base × (1 + TCA<sub>n</sub>)</p>
                <p className="ml-4 mt-1 text-sm text-gray-500">
                  O valor de chaves corrigido no mês n é o valor de chaves base multiplicado por 1 mais 
                  a taxa de correção acumulada daquele mês.
                </p>
              </div>
              
              <div>
                <p className="font-medium">Pagamento Total:</p>
                <p className="ml-4 text-gray-700">PT<sub>n</sub> = Parcela Corrigida + Reforço Corrigido + Chaves Corrigido</p>
                <p className="ml-4 mt-1 text-sm text-gray-500">
                  O pagamento total no mês n é a soma de todos os pagamentos corrigidos daquele mês.
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium">Exemplo de Cálculo</h3>
            <p className="text-sm text-gray-700 mb-4">
              Para um imóvel de R$ 120.000,00 com entrada de R$ 20.000,00, parcelas mensais de R$ 10.000,00, 
              com correção de 1% nos primeiros 5 meses e 2% do mês 6 em diante:
            </p>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Mês</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Corr. Acum.</TableHead>
                  <TableHead>Pgto Líquido</TableHead>
                  <TableHead>Saldo Líquido</TableHead>
                  <TableHead>Saldo Corrigido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>0</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>0,00%</TableCell>
                  <TableCell>R$ 20.000,00</TableCell>
                  <TableCell>R$ 100.000,00</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1</TableCell>
                  <TableCell>1%</TableCell>
                  <TableCell>1,00%</TableCell>
                  <TableCell>R$ 10.000,00</TableCell>
                  <TableCell>R$ 100.000,00</TableCell>
                  <TableCell>R$ 101.000,00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2</TableCell>
                  <TableCell>1%</TableCell>
                  <TableCell>2,01%</TableCell>
                  <TableCell>R$ 10.000,00</TableCell>
                  <TableCell>R$ 90.000,00</TableCell>
                  <TableCell>R$ 91.809,00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3</TableCell>
                  <TableCell>1%</TableCell>
                  <TableCell>3,03%</TableCell>
                  <TableCell>R$ 10.000,00</TableCell>
                  <TableCell>R$ 80.000,00</TableCell>
                  <TableCell>R$ 82.424,08</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>4</TableCell>
                  <TableCell>1%</TableCell>
                  <TableCell>4,06%</TableCell>
                  <TableCell>R$ 10.000,00</TableCell>
                  <TableCell>R$ 70.000,00</TableCell>
                  <TableCell>R$ 72.842,28</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CalculationMemory;