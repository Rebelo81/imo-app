import { useParams } from "wouter";
import PlanihaPage from "../planilha";

export default function PlanilhaPrintPage() {
  const params = useParams();
  const planilhaId = params.id || 'default';

  // Capturar dados dos parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialData = {
    valorImovel: urlParams.get('valorImovel') ? Number(urlParams.get('valorImovel')) : undefined,
    valorEntrada: urlParams.get('valorEntrada') ? Number(urlParams.get('valorEntrada')) : undefined,
    prazoEntrega: urlParams.get('prazoEntrega') ? Number(urlParams.get('prazoEntrega')) : undefined,
    prazoPagamento: urlParams.get('prazoPagamento') ? Number(urlParams.get('prazoPagamento')) : undefined,
    correcaoMensalAteChaves: urlParams.get('correcaoMensalAteChaves') ? Number(urlParams.get('correcaoMensalAteChaves')) : undefined,
    correcaoMensalAposChaves: urlParams.get('correcaoMensalAposChaves') ? Number(urlParams.get('correcaoMensalAposChaves')) : undefined,
    tipoParcelamento: urlParams.get('tipoParcelamento') as 'automatico' | 'personalizado' | undefined,
    adicionarReforcos: urlParams.get('adicionarReforcos') === 'true',
    valorReforco: urlParams.get('valorReforco') ? Number(urlParams.get('valorReforco')) : undefined,
    periodicidadeReforco: urlParams.get('periodicidadeReforco') as 'bimestral' | 'trimestral' | 'semestral' | 'anual' | undefined,
    adicionarValorChaves: urlParams.get('adicionarValorChaves') === 'true',
    valorChaves: urlParams.get('valorChaves') ? Number(urlParams.get('valorChaves')) : undefined,
    nomeCalculo: urlParams.get('nomeCalculo') || undefined,
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Usar o componente principal da planilha em modo de impressão */}
      <PlanihaPage printMode={true} initialData={initialData} />
    </div>
  );
}