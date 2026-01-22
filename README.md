# VertixBet - Plataforma de Cassino e Apostas Esportivas

Front-end recriado - Uma plataforma moderna de cassino e apostas esportivas.

## 🚀 Arquitetura

- **Frontend**: React com Vite e TypeScript
- **Backend**: Python com FastAPI

## 📦 Instalação

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# ou venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## 🏃 Executar em Desenvolvimento

### Frontend

```bash
cd frontend
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) no seu navegador.

### Backend

```bash
cd backend
source venv/bin/activate  # macOS/Linux
# ou venv\Scripts\activate  # Windows
uvicorn main:app --reload --port 8000
```

A API estará disponível em: http://localhost:8000
Documentação interativa: http://localhost:8000/docs

## 🏗️ Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/
│   │   ├── PromoBanner.tsx      # Banner promocional superior
│   │   ├── Header.tsx            # Cabeçalho com logo e navegação
│   │   ├── HeroBanner.tsx        # Banner principal hero
│   │   ├── SearchBar.tsx         # Barra de pesquisa
│   │   ├── GameCards.tsx         # Cards de jogos/categorias
│   │   ├── Sidebar.tsx           # Menu lateral
│   │   ├── NovidadesSection.tsx  # Seção de novidades
│   │   ├── Footer.tsx            # Rodapé
│   │   ├── BottomNav.tsx         # Navegação inferior fixa
│   │   └── ChatWidget.tsx        # Widget de chat
│   ├── App.tsx                   # Componente principal
│   └── index.css                 # Estilos globais

backend/
├── main.py                       # API principal
└── requirements.txt              # Dependências Python
```

## 🎨 Cores Principais

- **Teal Escuro**: `#0a4d3e` - Header e navegação
- **Dourado**: `#d4af37` - Destaques e CTAs
- **Laranja**: `#ff6b35` - Botões e acentuações
- **Fundo Escuro**: `#0a0e0f` - Background principal

## ✨ Funcionalidades

- ✅ Banner promocional com opção de fechar
- ✅ Header responsivo com logo e navegação
- ✅ Hero banner com carousel
- ✅ Barra de pesquisa de jogos
- ✅ Cards de jogos/categorias com scroll horizontal
- ✅ Menu lateral responsivo
- ✅ Navegação inferior fixa
- ✅ Widget de chat
- ✅ Design responsivo
- ✅ Backend API com FastAPI

## 📝 Próximos Passos

- Integrar frontend com backend
- Adicionar autenticação
- Implementar funcionalidades de jogos
- Adicionar mais animações e interações
- Implementar rotas no frontend (React Router)

## 📄 Licença

Este projeto é privado.
