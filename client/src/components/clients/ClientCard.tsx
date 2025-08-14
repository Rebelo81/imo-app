import { Client } from "@shared/schema";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building, Pencil, Trash, ChevronRight } from "lucide-react";

interface ClientCardProps {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  // Fetch projections for this client
  const { data: projections = [] } = useQuery<any[]>({
    queryKey: ['/api/projections'],
    select: (data) => data.filter((p) => p.clientId === client.id),
  });

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow">
      <CardContent className="p-3 md:p-4">
        {/* Client header */}
        <div className="mb-2 flex justify-between items-start">
          <div>
            <div className="text-xs text-gray-500 mb-1">Cliente #{client.userSequentialId || client.id}</div>
            <h3 className="text-base md:text-lg font-semibold text-primary">{client.name}</h3>
          </div>
          <div className="flex space-x-0.5 md:space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-6 w-6 md:h-7 md:w-7"
            >
              <Pencil className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-6 w-6 md:h-7 md:w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </Button>
          </div>
        </div>
        
        {/* Contact info - horizontal layout */}
        <div className="flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 text-xs md:text-sm mb-2 md:mb-3">
          {client.email && (
            <div className="flex items-center text-slate-600">
              <Mail className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          
          {client.phone && (
            <div className="flex items-center text-slate-600">
              <Phone className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5 text-slate-400 flex-shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
          
          {client.company && (
            <div className="flex items-center text-slate-600">
              <Building className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{client.company}</span>
            </div>
          )}
        </div>
        
        {/* Associated projections - versão minimalista */}
        <div className={`border-t pt-1.5 md:pt-2 ${projections.length > 0 ? 'mt-1.5 md:mt-2' : 'mt-0'}`}>
          <div className="flex justify-between items-center">
            <div className="text-xs md:text-sm text-slate-500">
              {projections.length === 0 ? "Sem projeções" : 
               projections.length === 1 ? "1 Projeção" : 
               `${projections.length} Projeções`}
            </div>
            {projections.length > 0 && 
              <Link href={`/projections?clientId=${client.id}`} className="text-xs text-primary hover:underline">
                Ver todas
              </Link>
            }
          </div>
          
          {projections.length > 0 && (
            <div className="mt-1 md:mt-1.5">
              {/* Apenas a projeção mais recente */}
              {projections.slice(0, 1).map((projection) => (
                <Link 
                  key={projection.id}
                  href={`/projections/${projection.id}`} 
                  className="flex items-center py-1 md:py-1.5 px-2 md:px-2.5 bg-slate-50 hover:bg-slate-100 rounded transition-colors"
                >
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-xs md:text-sm truncate">{projection.title}</div>
                  </div>
                  <ChevronRight className="h-3 w-3 md:h-3.5 md:w-3.5 text-slate-400 flex-shrink-0 ml-1" />
                </Link>
              ))}
              
              {projections.length > 1 && (
                <div className="text-xs text-slate-500 mt-1 md:mt-1.5 pl-1">
                  {projections.length - 1 === 1 ? 
                    "+ 1 outra projeção" : 
                    `+ ${projections.length - 1} outras projeções`}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
