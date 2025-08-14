import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, X } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useLocation } from "wouter";
import { useState } from "react";

export function SubscriptionAlert() {
  const { subscriptionStatus, hasAccess } = useSubscriptionAccess();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Don't show alert if user has access or if dismissed or no subscription data
  if (hasAccess || dismissed || !subscriptionStatus) {
    return null;
  }

  const getAlertContent = () => {
    switch (subscriptionStatus.status) {
      case 'expired':
      case 'canceled':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          variant: "destructive" as const,
          title: "Assinatura Expirada",
          description: "Sua assinatura expirou. Reative para continuar usando o sistema.",
          action: "Reativar Assinatura"
        };
      
      case 'cancel_at_period_end':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          variant: "default" as const,
          title: "Assinatura Cancelada",
          description: `Sua assinatura foi cancelada e expirará em ${subscriptionStatus.subscriptionCurrentPeriodEnd ? new Date(subscriptionStatus.subscriptionCurrentPeriodEnd).toLocaleDateString('pt-BR') : 'breve'}.`,
          action: "Gerenciar Assinatura"
        };
      
      case 'incomplete':
      case 'incomplete_expired':
      case 'unpaid':
      case 'past_due':
        return {
          icon: <CreditCard className="h-4 w-4" />,
          variant: "destructive" as const,
          title: "Problema no Pagamento",
          description: "Há um problema com sua assinatura. Atualize suas informações de pagamento.",
          action: "Atualizar Pagamento"
        };
      
      case 'none':
        return {
          icon: <CreditCard className="h-4 w-4" />,
          variant: "default" as const,
          title: "Assinatura Necessária",
          description: "Para acessar todos os recursos, você precisa de uma assinatura ativa.",
          action: "Assinar Agora"
        };
      
      default:
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          variant: "default" as const,
          title: "Problema na Assinatura",
          description: subscriptionStatus.message || "Há um problema com sua assinatura.",
          action: "Verificar Assinatura"
        };
    }
  };

  const alertContent = getAlertContent();

  const handleAction = () => {
    setLocation('/settings?tab=subscription');
  };

  return (
    <Alert variant={alertContent.variant} className="mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {alertContent.icon}
          <div className="flex-1">
            <h4 className="font-semibold">{alertContent.title}</h4>
            <AlertDescription className="mt-1">
              {alertContent.description}
            </AlertDescription>
            <Button
              onClick={handleAction}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <CreditCard className="h-3 w-3 mr-2" />
              {alertContent.action}
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setDismissed(true)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}