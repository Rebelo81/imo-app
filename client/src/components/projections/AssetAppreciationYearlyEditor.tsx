import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { UseFormReturn } from "react-hook-form";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatPercentage } from "@/lib/utils";
import { Pen, Save } from "lucide-react";

interface AssetAppreciationYearlyEditorProps {
  form: UseFormReturn<any>;
  scenario: "conservative" | "padrao" | "optimistic";
  years: number;
  baseAppreciation: number;
}

export function AssetAppreciationYearlyEditor({ 
  form, 
  scenario, 
  years, 
  baseAppreciation 
}: AssetAppreciationYearlyEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [yearlyRates, setYearlyRates] = useState<number[]>([]);
  
  // Obter valores atuais ou criar valores padrão com base na apreciação anual
  const getYearlyAppreciationValues = () => {
    const fieldName = `${scenario}.assetAppreciation.yearlyRates`;
    const currentValues = form.getValues(fieldName) || [];
    
    // Se não houver valores ou se o número de anos mudou, crie novos valores
    if (currentValues.length !== years) {
      return Array(years).fill(0).map((_, i) => {
        return currentValues[i] !== undefined ? currentValues[i] : baseAppreciation;
      });
    }
    
    return currentValues;
  };
  
  // Inicializar os valores quando o componente montar ou quando as props mudarem
  useEffect(() => {
    const values = getYearlyAppreciationValues();
    setYearlyRates(values);
    
    // Atualizar o formulário apenas se necessário (quando a quantidade de anos mudar)
    const fieldName = `${scenario}.assetAppreciation.yearlyRates`;
    const currentValues = form.getValues(fieldName) || [];
    if (currentValues.length !== years) {
      form.setValue(fieldName, values);
    }
  }, [scenario, years, baseAppreciation]);
  
  // Atualizar o estado quando o diálogo é aberto
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setYearlyRates(getYearlyAppreciationValues());
    }
    setIsOpen(open);
  };
  
  // Atualizar um valor específico de ano
  const handleYearValueChange = (yearIndex: number, value: string) => {
    const newValue = parseFloat(value) || 0;
    const newRates = [...yearlyRates];
    newRates[yearIndex] = newValue;
    setYearlyRates(newRates);
  };
  
  // Salvar as alterações no formulário
  const handleSave = () => {
    form.setValue(`${scenario}.assetAppreciation.yearlyRates`, yearlyRates);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Pen className="h-3.5 w-3.5" />
          Editar Valorização Anual
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Valorização Anual</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Defina a valorização para cada ano do período de {years} anos. 
            O valor base é de {formatPercentage(baseAppreciation)}.
          </p>
          
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Valorização por Ano</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead>Valorização Anual (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlyRates.map((rate, index) => (
                    <TableRow key={index}>
                      <TableCell>Ano {index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Input
                            type="number"
                            value={rate}
                            onChange={(e) => handleYearValueChange(index, e.target.value)}
                            className="w-24 h-8 text-right"
                            step="0.1"
                          />
                          <span className="ml-2">%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} className="gap-1">
              <Save className="h-4 w-4" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}