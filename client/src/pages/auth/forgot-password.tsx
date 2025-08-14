import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export default function ForgotPassword() {
  const handleWhatsAppClick = () => {
    window.open('https://api.whatsapp.com/send/?phone=5554997111650', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
            <CardDescription>
              Vamos ajudá-lo a redefinir sua senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Como redefinir sua senha
                </h3>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">1.</span>
                    <span>Clique no botão abaixo para abrir uma conversa no WhatsApp com nosso suporte</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">2.</span>
                    <span>Informe o email cadastrado em sua conta</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">3.</span>
                    <span>Nossa equipe de suporte enviará uma nova senha para o seu email</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">4.</span>
                    <span>Após receber o email, você poderá fazer login com a nova senha</span>
                  </li>
                </ol>
              </div>

              <div className="text-center space-y-3">
                <p className="text-sm text-slate-600">
                  Nossa equipe de suporte está pronta para ajudá-lo a recuperar o acesso à sua conta.
                </p>
                
                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-3"
                  size="lg"
                >
                  <FaWhatsapp className="h-6 w-6" />
                  <span className="font-medium">Abrir conversa no WhatsApp</span>
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Link 
                href="/auth/login" 
                className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}