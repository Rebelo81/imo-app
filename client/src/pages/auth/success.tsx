import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando seu pagamento...');
  const { refreshUser } = useAuth();

  useEffect(() => {
    const processAutoLogin = async () => {
      try {
        // Get session_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (!sessionId) {
          setStatus('error');
          setMessage('Sessão não encontrada. Tente fazer login manualmente.');
          return;
        }

        console.log('🎯 Processing auto-login for session:', sessionId);

        // Wait for webhook to process and user creation (reduced time)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Get session metadata from Stripe and try auto-login
        try {
          const response = await fetch('/api/stripe/get-session-metadata', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });

          if (response.ok) {
            const sessionData = await response.json();
            console.log('📧 Attempting auto-login for email:', sessionData.email);
            
            // Try auto-login with the email
            const autoLoginResponse = await fetch('/api/auth/auto-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: sessionData.email }),
            });

            if (autoLoginResponse.ok) {
              console.log('✅ Auto-login successful');
              await refreshUser();
              setStatus('success');
              setMessage('Pagamento confirmado! Redirecionando para o dashboard...');
              
              // Wait for authentication to be properly established
              let attempts = 0;
              const maxAttempts = 10;
              
              const waitForAuth = async () => {
                try {
                  const response = await fetch('/api/users/current');
                  if (response.ok) {
                    console.log('✅ Authentication confirmed, redirecting to dashboard');
                    setLocation('/dashboard');
                    return;
                  }
                } catch (error) {
                  console.log('Still waiting for authentication...');
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                  setTimeout(waitForAuth, 500);
                } else {
                  console.log('⚠️ Max attempts reached, redirecting anyway');
                  setLocation('/dashboard');
                }
              };
              
              setTimeout(waitForAuth, 1000);
              return;
            }
          }
        } catch (error) {
          console.log('Auto-login via session metadata failed, trying direct refresh...');
        }

        // Fallback: Try direct user refresh (session might already exist)
        const attempts = [1000, 2000, 3000]; // 1s, 2s, 3s intervals
        
        for (const delay of attempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            await refreshUser();
            setStatus('success');
            setMessage('Pagamento confirmado! Redirecionando para o dashboard...');
            
            // Wait for authentication to be properly established
            let attempts = 0;
            const maxAttempts = 10;
            
            const waitForAuth = async () => {
              try {
                const response = await fetch('/api/users/current');
                if (response.ok) {
                  console.log('✅ Authentication confirmed via refresh, redirecting to dashboard');
                  setLocation('/dashboard');
                  return;
                }
              } catch (error) {
                console.log('Still waiting for authentication...');
              }
              
              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(waitForAuth, 500);
              } else {
                console.log('⚠️ Max attempts reached, redirecting anyway');
                setLocation('/dashboard');
              }
            };
            
            setTimeout(waitForAuth, 1000);
            return;
          } catch (error) {
            console.log('Direct refresh attempt failed, trying again...');
          }
        }

        // If all attempts failed
        setStatus('error');
        setMessage('Pagamento processado com sucesso! Por favor, faça login para acessar sua conta.');

      } catch (error) {
        console.error('Error processing payment success:', error);
        setStatus('error');
        setMessage('Erro ao processar pagamento. Tente fazer login manualmente.');
      }
    };

    processAutoLogin();
  }, [refreshUser, setLocation]);

  const handleManualLogin = () => {
    setLocation('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'processing' && (
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-600" />
            )}
            {status === 'error' && (
              <CheckCircle className="h-16 w-16 text-orange-600" />
            )}
          </div>
          <CardTitle className="text-xl font-bold">
            {status === 'processing' && 'Processando Pagamento'}
            {status === 'success' && 'Pagamento Confirmado!'}
            {status === 'error' && 'Pagamento Processado'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {message}
          </p>
          
          {status === 'processing' && (
            <div className="text-sm text-gray-500">
              Aguarde enquanto confirmamos seu pagamento e ativamos sua conta...
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Sua assinatura foi ativada com sucesso. Use suas credenciais para acessar o sistema.
              </p>
              <Button 
                onClick={handleManualLogin}
                className="w-full bg-[#434BE6] hover:bg-[#363acc]"
              >
                Fazer Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}