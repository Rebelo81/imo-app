import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Building2, PlusCircle, Heart, Sparkles, PlayCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./AuthProvider";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const markAsSeenMutation = useMutation({
    mutationFn: async () => {
      // Só marcar como visto se o checkbox estiver marcado
      if (dontShowAgain) {
        return apiRequest("PATCH", "/api/users/welcome-modal-seen", {});
      }
      return Promise.resolve(); // Não fazer nada se checkbox desmarcado
    },
    onSuccess: () => {
      if (dontShowAgain) {
        queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      }
      onClose();
    },
  });

  const handleClose = () => {
    markAsSeenMutation.mutate();
  };

  const tutorialVideos = [
    {
      title: "Configurações Iniciais",
      description: "Configure sua conta para começar",
      videoUrl: "https://www.youtube.com/embed/c7nyWLDxaJk",
      icon: <Settings className="h-4 w-4 text-[#434BE6]" />,
    },
    {
      title: "Cadastrar Imóvel",
      description: "Primeiro passo para suas projeções",
      videoUrl: "https://www.youtube.com/embed/B6QvDmMBc-s",
      icon: <Building2 className="h-4 w-4 text-[#434BE6]" />,
    },
    {
      title: "Criar Nova Projeção",
      description: "Gere sua primeira projeção",
      videoUrl: "https://www.youtube.com/embed/Fc4l6Vhq3mU?start=9",
      icon: <PlusCircle className="h-4 w-4 text-[#434BE6]" />,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()} modal>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header com ícones e centralizado */}
        <DialogHeader className="text-center px-6 pt-6 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-6 w-6 text-[#434BE6]" />
            <DialogTitle className="text-xl font-bold text-slate-800">
              Bem-vindo ao Roimob!
            </DialogTitle>
            <Sparkles className="h-6 w-6 text-[#434BE6]" />
          </div>
          <DialogDescription className="text-slate-600 text-sm leading-relaxed max-w-2xl mx-auto">
            Você está dando o primeiro passo para transformar a forma como apresenta investimentos imobiliários.
            Para facilitar sua jornada, separamos alguns tutoriais rápidos.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Tutorial Videos Grid - Compacto e alinhado */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {tutorialVideos.map((tutorial, index) => (
              <Card key={index} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {tutorial.icon}
                    <CardTitle className="text-sm font-semibold text-slate-800">
                      {tutorial.title}
                    </CardTitle>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {tutorial.description}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="aspect-video rounded-md overflow-hidden border border-slate-200">
                    <iframe
                      src={tutorial.videoUrl}
                      title={tutorial.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Informação sobre página de tutoriais */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <PlayCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Mais tutoriais disponíveis
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Você pode assistir novamente estes vídeos ou encontrar tutoriais adicionais 
                  visitando a página <span className="font-medium">"Tutoriais"</span> no menu lateral do sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Footer compacto */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm text-slate-600 cursor-pointer"
              >
                Não mostrar novamente
              </label>
            </div>
            <Button
              onClick={handleClose}
              className="bg-[#434BE6] hover:bg-[#363acc] text-white px-6"
              disabled={markAsSeenMutation.isPending}
            >
              {markAsSeenMutation.isPending ? "Salvando..." : "Fechar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}