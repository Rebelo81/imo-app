import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";

// Form schema
const propertyFormSchema = z.object({
  propertyId: z.string().optional(),
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
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  onSubmit: (values: PropertyFormValues) => void;
  defaultValues?: PropertyFormValues;
  existingPropertyId?: number;
  onPropertySelect?: (propertyId: number) => void;
}

export default function PropertyForm({
  onSubmit,
  defaultValues,
  existingPropertyId,
  onPropertySelect,
}: PropertyFormProps) {
  // Fetch properties for dropdown
  const { data: properties, isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Initialize form
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: defaultValues || {
      propertyId: existingPropertyId?.toString() || "novo",
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
    },
  });

  // Update form when property is selected
  useEffect(() => {
    if (existingPropertyId && properties) {
      const selectedProperty = properties.find(
        (p) => p.id === existingPropertyId
      );
      if (selectedProperty) {
        form.reset({
          propertyId: existingPropertyId.toString(),
          name: selectedProperty.name || "",
          type: selectedProperty.type || "",
          unit: selectedProperty.unit || "",
          area: selectedProperty.area?.toString() || "",
          description: selectedProperty.description || "",
          imageUrl: selectedProperty.imageUrl || "",
          address: selectedProperty.address || "",
          neighborhood: selectedProperty.neighborhood || "",
          city: selectedProperty.city || "",
          state: selectedProperty.state || "",
          zipCode: selectedProperty.zipCode || "",
        });
      }
    }
  }, [existingPropertyId, properties, form]);

  // Handle property selection
  const handlePropertySelect = (propertyId: string) => {
    if (propertyId === "novo") {
      // Caso de novo imóvel
      form.reset({
        propertyId: "novo",
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
      });
    } else if (propertyId && properties) {
      // Caso de seleção de imóvel existente
      const selectedProperty = properties.find(
        (p) => p.id === parseInt(propertyId)
      );
      
      if (selectedProperty) {
        form.reset({
          propertyId,
          name: selectedProperty.name || "",
          type: selectedProperty.type || "",
          unit: selectedProperty.unit || "",
          area: selectedProperty.area?.toString() || "",
          description: selectedProperty.description || "",
          imageUrl: selectedProperty.imageUrl || "",
          address: selectedProperty.address || "",
          neighborhood: selectedProperty.neighborhood || "",
          city: selectedProperty.city || "",
          state: selectedProperty.state || "",
          zipCode: selectedProperty.zipCode || "",
        });
        
        if (onPropertySelect) {
          onPropertySelect(parseInt(propertyId));
        }
      }
    } else {
      // Caso de resetar o formulário
      form.reset({
        propertyId: "novo",
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
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Imóvel</CardTitle>
        <CardDescription>
          Preencha os dados do imóvel para a projeção
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Property Selection */}
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selecionar Imóvel Existente (opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handlePropertySelect(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um imóvel cadastrado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="novo">
                        Cadastrar novo imóvel
                      </SelectItem>
                      {properties?.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.name} ({property.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Escolha um imóvel existente ou cadastre um novo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Basic Property Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Empreendimento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Edifício Manhattan" {...field} />
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
                    <FormLabel>Tipo de Imóvel</FormLabel>
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
                        <SelectItem value="Apartamento">Apartamento</SelectItem>
                        <SelectItem value="Casa">Casa</SelectItem>
                        <SelectItem value="Terreno">Terreno</SelectItem>
                        <SelectItem value="Sala Comercial">
                          Sala Comercial
                        </SelectItem>
                        <SelectItem value="Lote Comercial">
                          Lote Comercial
                        </SelectItem>
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
                    <FormLabel>Área Privativa (m²)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 75"
                        {...field}
                      />
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
                  <FormLabel>Descrição do Imóvel</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhes importantes do imóvel"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem do Imóvel</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="URL da imagem ou link para página do imóvel"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Cole o link de uma imagem ou da página do imóvel
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Fields */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
