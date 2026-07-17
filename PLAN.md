# Plano de Implementação Revisto: Automação de Publicação Cruzada & Criação de Vídeos Virais

Este plano define a arquitetura para o agente autónomo diário de gestão de redes sociais, operando sem armazenamento em disco físico e incluindo a criação de vídeos virais automáticos.

---

## 🎯 Objetivos de Negócio & Funcionais

1. **Upload via Memory Streaming (Sem Disco)**:
   - O download do YouTube é feito em buffer e transmitido por *pipe* direto na memória RAM para as APIs de upload do Instagram/TikTok. 
   - Nenhum ficheiro MP4 é gravado no disco rígido do utilizador.
2. **Migração Faseada & Filtro de Duração**:
   - Apenas processar vídeos com **duração inferior a 5 minutos** (Shorts e pequenos tutoriais).
   - Limite estrito de processamento diário: **máximo de 3 a 5 vídeos** do histórico por dia.
3. **Criação de Conteúdo Viral Diário**:
   - O agente pesquisa temas virais na internet (via APIs de tendências ou notícias).
   - Gera um guião e cria um vídeo curto (usando ferramentas integradas no Composio ou sintetizadores de vídeo programáticos/IA).
   - Publica o vídeo gerado no YouTube, Instagram (Stories/Reels) e TikTok, com títulos, descrições e hashtags otimizados em **Inglês**.
4. **Relatório Diário Automatizado**:
   - Gravar o status de execução no final do dia em `daily_social_report.md`.

---

## 🛠️ Arquitetura Técnica

### 1. Fluxo do Agente de Publicação Cruzada (Pipes em Memória)
```
[YouTube Video Stream] ──(Buffer em RAM)──> [Multipart Upload Stream] ──> [Instagram/TikTok API]
```
- Usamos fluxos de leitura da stream do YouTube e canalizamos diretamente na requisição de upload.

### 2. Fluxo do Agente de Criação de Vídeos Virais
```
[Pesquisa de Tendências] ──> [Gerador de Guião IA (Inglês)] ──> [Renderizador/Sintetizador de Vídeo] ──> [Upload em Lote]
```

### 3. Ficheiro de Estado (`social_state.json`)
Mantido de forma leve para controlar o progresso diário de migração (ids processados, limites de quota, datas).

---

## 📋 Plano de Passos para o GPT-5.6 Sol (Worker)

1. **Configuração do Ambiente e Dependências**: Configurar pacotes npm para streaming e conexões do Composio MCP.
2. **Desenvolvimento do Script Core (`social-media-agent.mjs`)**:
   - Módulo de download e upload direto via Streams em memória.
   - Módulo de geração de vídeo viral diário (Pesquisa de tendências + Geração de vídeo/imagem + Upload).
3. **Script de Inicialização e Agendador**: Criar um script PowerShell/Node leve executado em segundo plano diariamente.
4. **Testes Unitários**: Validar o fluxo de streams e a integração com o Composio.
