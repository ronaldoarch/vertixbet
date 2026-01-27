import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PoliticaKYC() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e0f] text-white py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>

        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[#d4af37]">
          Política KYC (Know Your Customer)
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Introdução</h2>
            <p>
              A VertixBet está comprometida em prevenir lavagem de dinheiro, financiamento do terrorismo e outras atividades ilegais. 
              Nossa Política KYC (Know Your Customer) garante que conhecemos e verificamos a identidade de todos os nossos clientes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Verificação de Identidade</h2>
            <p>
              Todos os clientes devem passar por um processo de verificação de identidade antes de poder realizar depósitos ou saques. 
              Isso inclui:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Verificação de documentos de identidade (RG, CNH ou Passaporte)</li>
              <li>Verificação de comprovante de endereço (conta de luz, água ou telefone)</li>
              <li>Verificação de CPF</li>
              <li>Verificação de idade (mínimo 18 anos)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Documentos Aceitos</h2>
            <p><strong>Documentos de Identidade:</strong></p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>RG (Registro Geral) - frente e verso</li>
              <li>CNH (Carteira Nacional de Habilitação) - frente e verso</li>
              <li>Passaporte</li>
            </ul>
            <p className="mt-4"><strong>Comprovante de Endereço:</strong></p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Conta de luz, água ou telefone (últimos 3 meses)</li>
              <li>Extrato bancário (últimos 3 meses)</li>
              <li>Comprovante de aluguel ou escritura</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Processo de Verificação</h2>
            <ol className="list-decimal pl-6 mt-2 space-y-2">
              <li>Envie os documentos solicitados através da plataforma</li>
              <li>Nossa equipe revisará os documentos em até 48 horas úteis</li>
              <li>Você receberá uma notificação sobre o status da verificação</li>
              <li>Se aprovado, você poderá realizar depósitos e saques normalmente</li>
              <li>Se rejeitado, você receberá instruções sobre como corrigir o problema</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Requisitos dos Documentos</h2>
            <p>Os documentos devem atender aos seguintes requisitos:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Estar legíveis e claros</li>
              <li>Estar dentro do prazo de validade (quando aplicável)</li>
              <li>Mostrar todas as informações necessárias</li>
              <li>Estar em formato digital (JPG, PNG ou PDF)</li>
              <li>Ter tamanho máximo de 10MB por arquivo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Verificação Contínua</h2>
            <p>
              Podemos solicitar verificação adicional ou atualização de documentos a qualquer momento, especialmente em casos de:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Transações de alto valor</li>
              <li>Mudança de informações da conta</li>
              <li>Atividades suspeitas</li>
              <li>Requisitos regulatórios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Proteção de Dados</h2>
            <p>
              Todos os documentos e informações fornecidos são tratados com total confidencialidade e segurança, 
              em conformidade com nossa Política de Privacidade e regulamentações aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Recusa de Verificação</h2>
            <p>
              Reservamo-nos o direito de recusar ou suspender contas que não completem o processo de verificação KYC 
              ou que forneçam informações falsas ou fraudulentas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Contato</h2>
            <p>
              Se você tiver dúvidas sobre o processo de verificação KYC ou precisar de assistência, 
              entre em contato com nosso suporte ao cliente.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}
