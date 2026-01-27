import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function JogoResponsavel() {
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
          Jogo Responsável
        </h1>

        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Compromisso com o Jogo Responsável</h2>
            <p>
              A VertixBet está comprometida em promover o jogo responsável e proteger nossos clientes dos riscos associados 
              ao jogo excessivo. Acreditamos que o jogo deve ser uma forma de entretenimento, não uma fonte de problemas financeiros ou pessoais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Sinais de Alerta</h2>
            <p>Fique atento aos seguintes sinais que podem indicar um problema com jogos:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Gastar mais dinheiro ou tempo do que você pode se permitir</li>
              <li>Sentir necessidade de jogar com quantias cada vez maiores</li>
              <li>Tentar recuperar perdas jogando mais</li>
              <li>Sentir ansiedade ou estresse relacionado ao jogo</li>
              <li>Negligenciar responsabilidades pessoais ou profissionais</li>
              <li>Mentir sobre seus hábitos de jogo</li>
              <li>Pedir dinheiro emprestado para jogar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Ferramentas de Controle</h2>
            <p>Oferecemos várias ferramentas para ajudá-lo a manter o controle:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Limites de Depósito:</strong> Defina limites diários, semanais ou mensais</li>
              <li><strong>Limites de Perda:</strong> Estabeleça um limite máximo de perdas</li>
              <li><strong>Limites de Tempo:</strong> Defina quanto tempo você pode jogar</li>
              <li><strong>Autoexclusão:</strong> Bloqueie temporária ou permanentemente sua conta</li>
              <li><strong>Pausa de Conta:</strong> Faça uma pausa de 24 horas, 7 dias ou 30 dias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Dicas para Jogar com Responsabilidade</h2>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Estabeleça um orçamento antes de começar a jogar</li>
              <li>Nunca jogue com dinheiro que você não pode perder</li>
              <li>Não jogue quando estiver sob influência de álcool ou drogas</li>
              <li>Não jogue quando estiver emocionalmente abalado</li>
              <li>Faça pausas regulares</li>
              <li>Lembre-se de que o jogo é entretenimento, não uma forma de ganhar dinheiro</li>
              <li>Não persiga suas perdas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Ajuda e Suporte</h2>
            <p>
              Se você acredita que tem um problema com jogos, há várias organizações que podem ajudar:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Jogadores Anônimos:</strong> Grupo de apoio para pessoas com problemas de jogo</li>
              <li><strong>Centro de Valorização da Vida (CVV):</strong> Ligue 188 para apoio emocional</li>
              <li><strong>Conselho Federal de Psicologia:</strong> Busque ajuda profissional</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Proteção de Menores</h2>
            <p>
              É estritamente proibido que menores de 18 anos usem nossa plataforma. Implementamos medidas rigorosas 
              para verificar a idade de nossos clientes e prevenir o acesso de menores.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Autoexclusão</h2>
            <p>
              Se você sentir que precisa de uma pausa, oferecemos opções de autoexclusão:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Pausa Temporária:</strong> 24 horas, 7 dias ou 30 dias</li>
              <li><strong>Autoexclusão:</strong> Bloqueio permanente da conta</li>
            </ul>
            <p className="mt-4">
              Durante o período de autoexclusão, você não poderá fazer login, depositar ou jogar. 
              Esta decisão é irreversível durante o período escolhido.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Contato</h2>
            <p>
              Se você precisar de ajuda para configurar limites ou fazer uma autoexclusão, 
              entre em contato com nosso suporte ao cliente. Estamos aqui para ajudar.
            </p>
          </section>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 mt-8">
            <h3 className="text-xl font-semibold mb-2 text-yellow-400">Lembre-se</h3>
            <p>
              O jogo deve ser divertido e entretenimento. Se parar de ser divertido, é hora de parar. 
              Jogue com responsabilidade e dentro dos seus limites.
            </p>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}
