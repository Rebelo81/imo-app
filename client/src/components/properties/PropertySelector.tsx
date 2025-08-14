import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PropertyCreationForm from "@/components/properties/PropertyCreationForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface PropertySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PropertySelector({ value, onChange }: PropertySelectorProps) {
  const [isNewPropertyDialogOpen, setIsNewPropertyDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Buscar todas as propriedades disponíveis
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Mutation para criar nova propriedade
  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      // Se houver formData (upload de imagem), usar FormData
      if (data.formData) {
        const response = await fetch('/api/properties', {
          method: 'POST',
          body: data.formData,
        });
        
        if (!response.ok) {
          let errorMessage = 'Erro ao criar o imóvel';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Erro ao fazer parse da resposta de erro:', parseError);
            errorMessage = `Erro do servidor (${response.status}): ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } else {
        // Caso contrário, enviar como JSON
        const response = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          let errorMessage = 'Erro ao criar o imóvel';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Erro ao fazer parse da resposta de erro:', parseError);
            errorMessage = `Erro do servidor (${response.status}): ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      }
    },
    onSuccess: async (data) => {
      // Invalidar e aguardar a atualização do cache
      await queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      
      toast({
        title: "Imóvel cadastrado com sucesso",
        description: "O imóvel foi adicionado à sua lista.",
      });
      
      // Fechar o modal
      setIsNewPropertyDialogOpen(false);
      
      // Selecionar automaticamente a propriedade recém-criada
      if (data && data.id) {
        onChange(data.id.toString());
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar imóvel",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Função para lidar com a criação de propriedade
  const handleCreateProperty = (formData: any) => {
    createPropertyMutation.mutate(formData);
  };

  // Ordenar propriedades do mais recente ao mais antigo
  const sortedProperties = properties?.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          disabled={isLoading}
          value={value}
          onValueChange={onChange}
        >
          <SelectTrigger className="flex-1 h-10">
            <SelectValue 
              placeholder="Selecione um imóvel"
              className="text-left"
            />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            <SelectItem 
              value="novo" 
              className="text-blue-600 font-medium border-b border-gray-100 hover:bg-blue-50 focus:bg-blue-50 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">➕</span>
                <span>Cadastrar novo imóvel</span>
              </div>
            </SelectItem>
            {sortedProperties?.map((property) => (
              <SelectItem 
                key={property.id} 
                value={property.id.toString()}
                className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50 transition-all duration-200"
              >
                <div className="font-medium text-gray-900">{property.name}</div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="sm"
          type="button"
          className="border-2 border-blue-700 hover:border-blue-800 hover:bg-blue-50 text-blue-700 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsNewPropertyDialogOpen(true);
          }}
        >
          <span className="mr-1">➕</span>
          Novo Imóvel
        </Button>
      </div>

      {/* Modal para cadastro de nova propriedade */}
      <Dialog 
        open={isNewPropertyDialogOpen || value === "novo"} 
        onOpenChange={(open) => {
          // Quando abrir o modal via seletor, também atualizar o estado interno
          if (open && value === "novo" && !isNewPropertyDialogOpen) {
            setIsNewPropertyDialogOpen(true);
            return;
          }
          
          // Quando fechar manualmente, resetar o valor se estiver como "novo"
          if (!open && value === "novo") {
            onChange("");
          }
          
          setIsNewPropertyDialogOpen(open);
        }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Imóvel</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do imóvel que será utilizado na projeção.
            </DialogDescription>
          </DialogHeader>
          
          <PropertyCreationForm 
            onSubmit={handleCreateProperty}
            onCancel={() => {
              setIsNewPropertyDialogOpen(false);
              if (value === "novo") {
                onChange("");
              }
            }}
            isSubmitting={createPropertyMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}