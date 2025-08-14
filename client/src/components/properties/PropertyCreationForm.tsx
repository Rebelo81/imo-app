import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, ArrowLeft, Building2, Home, MapPin, ArrowRight, Save, FileText, Type } from "lucide-react";

// Form schema
export const propertyFormSchema = z.object({
  name: z.string().min(1, "Nome do imóvel é obrigatório"),
  type: z.string().min(1, "Tipo do imóvel é obrigatório"),
  unit: z.string().optional(),
  area: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  zipCode: z.string().optional(),
  listPrice: z.string().optional(),
  websiteUrl: z.string().optional(),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyCreationFormProps {
  onSubmit: (values: PropertyFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  defaultValues?: Partial<PropertyFormValues>;
}

export default function PropertyCreationForm({ 
  onSubmit, 
  onCancel, 
  isSubmitting,
  defaultValues 
}: PropertyCreationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Initialize form
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: defaultValues || {
      name: "",
      type: "",
      unit: "",
      area: "",
      description: "",
      imageUrl: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      listPrice: "",
      websiteUrl: "",
    },
  });

  // Watch form values for progress indicator
  const formValues = form.watch();

  // Handle form submission
  const handleSubmit = (values: PropertyFormValues) => {
    onSubmit(values);
  };

  // Go to next step
  const goToNextStep = () => {
    if (currentStep === 0) {
      // Validate fields in the current step before proceeding
      form.trigger(["name", "type", "area", "description", "imageUrl", "unit", "websiteUrl"]).then((isValid) => {
        if (isValid) {
          setCurrentStep(1);
        }
      });
    } else {
      form.handleSubmit(handleSubmit)();
    }
  };

  // Go to previous step
  const goToPreviousStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {currentStep === 0 ? "Dados do Imóvel" : "Localização"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentStep === 0
              ? "Informe os dados básicos do imóvel"
              : "Informe a localização do imóvel"}
          </p>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          Etapa {currentStep + 1} de 2
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Step 1: Basic Property Information */}
          {currentStep === 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-[#434BE6]" />
                        Nome do Empreendimento
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Edifício Villa Moderna" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-[#434BE6]" />
                        Tipo de Imóvel
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Residencial">Residencial</SelectItem>
                          <SelectItem value="Comercial">Comercial</SelectItem>
                          <SelectItem value="Terreno">Terreno</SelectItem>
                          <SelectItem value="Rural">Rural</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade/Apartamento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Apto 301" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área (m²)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 75" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informe detalhes sobre o imóvel"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo de upload de imagem */}
              <div className="flex flex-col items-center mb-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="flex items-center gap-2 text-[14px] justify-center">
                        <FileText className="h-4 w-4 text-[#434BE6]" />
                        Imagem do Imóvel (opcional)
                      </FormLabel>
                      <div className="flex flex-col gap-2">
                        {field.value ? (
                          <div className="rounded-md overflow-hidden border w-full h-[180px] flex items-center justify-center bg-gray-50 relative group">
                            <img 
                              src={field.value} 
                              alt="Imagem do imóvel" 
                              className="max-h-full max-w-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Se for uma URL da API, tentar remover o arquivo do servidor
                                  if (field.value && !field.value.startsWith('data:')) {
                                    const filename = field.value.split('/').pop();
                                    if (filename) {
                                      fetch(`/api/uploads/properties/${filename}`, {
                                        method: 'DELETE'
                                      }).catch(err => console.error('Erro ao remover imagem:', err));
                                    }
                                  }
                                  field.onChange("");
                                }}
                                className="absolute top-2 right-2"
                              >
                                <X className="h-4 w-4 mr-1" /> Remover
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-gray-300 rounded-md p-6 h-[180px] flex flex-col items-center justify-center cursor-pointer hover:border-[#434BE6]/50 transition-colors bg-gray-50/50 text-center">
                            <div className="w-16 h-16 mb-2 rounded-full bg-[#434BE6]/10 flex items-center justify-center">
                              <Building2 className="h-8 w-8 text-[#434BE6]" />
                            </div>
                            <p className="text-sm font-medium text-gray-700">Clique para adicionar uma foto do imóvel</p>
                            <p className="text-xs text-gray-500 mt-1">ou arraste uma imagem para cá</p>
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    // Validar tamanho do arquivo no cliente antes de enviar
                                    const fileSizeMB = file.size / (1024 * 1024);
                                    if (fileSizeMB > 5) {
                                      // Definir erro no formulário
                                      form.setError("imageUrl", {
                                        message: "A imagem deve ter no máximo 5MB"
                                      });
                                      return;
                                    }
                                    
                                    // Validar formato do arquivo
                                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                                    if (!validTypes.includes(file.type)) {
                                      // Definir erro no formulário
                                      form.setError("imageUrl", {
                                        message: "A imagem deve ser PNG ou JPEG"
                                      });
                                      return;
                                    }
                                    
                                    // Criar um FormData para enviar o arquivo
                                    const formData = new FormData();
                                    formData.append('image', file);
                                    
                                    // Enviar para o endpoint de upload
                                    const response = await fetch('/api/uploads/properties', {
                                      method: 'POST',
                                      body: formData,
                                    });
                                    
                                    // Se o upload falhar, tentar pegar a mensagem de erro específica
                                    if (!response.ok) {
                                      let errorMessage = "Erro ao fazer upload da imagem";
                                      try {
                                        const errorData = await response.json();
                                        errorMessage = errorData.error || errorMessage;
                                      } catch (e) {
                                        // Se não conseguir obter o JSON de erro, usar mensagem padrão
                                        if (response.status === 413) {
                                          errorMessage = "A imagem deve ter no máximo 5MB";
                                        }
                                      }
                                      
                                      // Mostrar erro no formulário
                                      form.setError("imageUrl", {
                                        message: errorMessage
                                      });
                                      return;
                                    }
                                    
                                    const data = await response.json();
                                    
                                    // Salvar apenas a URL da imagem no campo
                                    field.onChange(data.file.url);
                                    
                                    // Limpar erros do campo
                                    form.clearErrors("imageUrl");
                                  } catch (error: any) {
                                    console.error('Erro no upload:', error);
                                    // Mostrar erro no formulário
                                    form.setError("imageUrl", {
                                      message: "Não foi possível fazer o upload da imagem"
                                    });
                                  }
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                      <FormDescription className="text-xs mt-2 text-center">
                        Adicione uma foto do imóvel para facilitar a identificação
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Campo para URL do site do imóvel */}
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-[14px]">
                      <FileText className="h-4 w-4 text-[#434BE6]" />
                      Link do Imóvel (opcional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: https://www.site-da-construtora.com.br/imovel" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Cole o link para a página do imóvel no site da imobiliária ou construtora
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Step 2: Location Fields */}
          {currentStep === 1 && (
            <>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#434BE6]" />
                      Endereço Completo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Rua das Flores, 123"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(
                            (state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 00000-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onCancel : goToPreviousStep}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 0 ? "Cancelar" : "Voltar"}
            </Button>

            <Button
              type="button"
              onClick={currentStep === 1 ? form.handleSubmit(handleSubmit) : goToNextStep}
              disabled={isSubmitting}
              className="gap-2"
            >
              {currentStep === 1 ? (
                <>
                  <Save className="h-4 w-4" />
                  {isSubmitting ? "Salvando..." : "Salvar Imóvel"}
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}