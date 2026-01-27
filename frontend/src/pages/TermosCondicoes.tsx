import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermosCondicoes() {
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
          Termos e Condições
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e usar a plataforma VertixBet, você concorda em cumprir e estar vinculado aos seguintes Termos e Condições. 
              Se você não concorda com qualquer parte destes termos, não deve usar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Elegibilidade</h2>
            <p>
              Você deve ter pelo menos 18 anos de idade para usar nossos serviços. Ao criar uma conta, você declara e garante que:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Você tem pelo menos 18 anos de idade</li>
              <li>Você tem capacidade legal para celebrar contratos</li>
              <li>Você não está em nenhuma lista de exclusão de jogos</li>
              <li>Você não está violando nenhuma lei aplicável</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Conta de Usuário</h2>
            <p>
              Você é responsável por manter a confidencialidade de suas credenciais de conta e por todas as atividades que ocorrem 
              sob sua conta. Você deve notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Depósitos e Saques</h2>
            <p>
              Todos os depósitos e saques estão sujeitos a verificação e podem levar tempo para processamento. 
              Reservamo-nos o direito de solicitar documentação adicional para verificar sua identidade antes de processar transações.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Jogo Responsável</h2>
            <p>
              Promovemos o jogo responsável. Se você sentir que tem um problema com jogos de azar, entre em contato conosco 
              ou procure ajuda profissional. Oferecemos ferramentas de autoexclusão e limites de depósito.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo da plataforma, incluindo textos, gráficos, logos, ícones e software, é propriedade da VertixBet 
              ou de seus licenciadores e está protegido por leis de direitos autorais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Limitação de Responsabilidade</h2>
            <p>
              A VertixBet não será responsável por quaisquer danos diretos, indiretos, incidentais ou consequenciais resultantes 
              do uso ou incapacidade de usar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Modificações dos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes Termos e Condições a qualquer momento. 
              As alterações entrarão em vigor imediatamente após a publicação. É sua responsabilidade revisar regularmente estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Contato</h2>
            <p>
              Se você tiver dúvidas sobre estes Termos e Condições, entre em contato conosco através do nosso suporte ao cliente.
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
