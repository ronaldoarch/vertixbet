import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PoliticaPrivacidade() {
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
          Política de Privacidade
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Introdução</h2>
            <p>
              A VertixBet está comprometida em proteger sua privacidade. Esta Política de Privacidade descreve como coletamos, 
              usamos, armazenamos e protegemos suas informações pessoais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Informações que Coletamos</h2>
            <p>Coletamos os seguintes tipos de informações:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Informações de Identificação:</strong> Nome, CPF, data de nascimento, endereço de email, número de telefone</li>
              <li><strong>Informações Financeiras:</strong> Dados de pagamento, histórico de transações</li>
              <li><strong>Informações Técnicas:</strong> Endereço IP, tipo de navegador, dispositivo usado</li>
              <li><strong>Informações de Uso:</strong> Histórico de jogos, preferências, interações com a plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Como Usamos Suas Informações</h2>
            <p>Usamos suas informações para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Processar suas transações e gerenciar sua conta</li>
              <li>Verificar sua identidade e prevenir fraudes</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Enviar comunicações importantes sobre sua conta</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Compartilhamento de Informações</h2>
            <p>
              Não vendemos suas informações pessoais. Podemos compartilhar suas informações apenas nas seguintes situações:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Com provedores de serviços que nos ajudam a operar nossa plataforma</li>
              <li>Quando exigido por lei ou autoridades reguladoras</li>
              <li>Para proteger nossos direitos e prevenir fraudes</li>
              <li>Com seu consentimento explícito</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra 
              acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Seus Direitos</h2>
            <p>Você tem o direito de:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir informações incorretas</li>
              <li>Solicitar a exclusão de suas informações</li>
              <li>Opor-se ao processamento de suas informações</li>
              <li>Solicitar a portabilidade de seus dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Cookies</h2>
            <p>
              Usamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma e personalizar conteúdo. 
              Você pode gerenciar suas preferências de cookies nas configurações do navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Retenção de Dados</h2>
            <p>
              Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os propósitos descritos nesta política, 
              a menos que um período de retenção mais longo seja exigido ou permitido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas 
              publicando a nova política em nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Contato</h2>
            <p>
              Se você tiver dúvidas ou preocupações sobre esta Política de Privacidade ou sobre como tratamos suas informações, 
              entre em contato conosco através do nosso suporte ao cliente.
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
