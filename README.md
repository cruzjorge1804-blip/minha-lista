# Lista Compartilhada — guia de configuração

App de checklist compartilhado em tempo real para o seu grupo. Roda como PWA (instalável no celular) e é hospedado de graça no GitHub Pages.

## O que você vai fazer (leva uns 10-15 min)

### Passo 1 — Criar o projeto no Firebase
1. Acesse https://console.firebase.google.com e entre com sua conta Google.
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `lista-familia`) e siga o assistente (pode desativar o Google Analytics, não é necessário).
3. No menu lateral, vá em **Build > Firestore Database** e clique em **"Criar banco de dados"**.
   - Escolha o modo **produção**.
   - Escolha a região mais próxima de vocês (ex: `southamerica-east1` para Brasil).
4. Ainda no menu lateral, vá em **Build > Authentication > Sign-in method** e ative o provedor **"Anônimo"**.

### Passo 2 — Pegar as chaves de configuração
1. No menu lateral, clique na engrenagem ⚙️ ao lado de "Visão geral do projeto" > **Configurações do projeto**.
2. Em **"Seus apps"**, clique no ícone **`</>`** (Web) para registrar um novo app. Dê o nome que quiser e clique em registrar.
3. Copie o objeto `firebaseConfig` que aparece na tela.
4. Abra o arquivo `app.js` e cole seus valores no lugar de `SUA_API_KEY`, `SEU_PROJETO`, etc. (bem no topo do arquivo).

### Passo 3 — Configurar as regras de segurança do Firestore
No Firebase, vá em **Firestore Database > Regras** e substitua pelo conteúdo abaixo, depois clique em **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{itemId} {
      allow read, write: if request.auth != null;
    }
    match /habits/{habitId} {
      allow read, write: if request.auth != null;
    }
    match /habitLogs/{logId} {
      allow read, write: if request.auth != null;
    }
    match /milestones/{milestoneId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Isso garante que só quem abriu o app (autenticação anônima automática) pode ler e editar a lista e os hábitos — ninguém de fora consegue.

> Se você já tinha publicado as regras antigas (só com `items`), volte em **Firestore Database > Regras** e cole essa versão atualizada por cima, depois **Publicar** de novo.

### Passo 4 — Subir os arquivos para o GitHub
1. No app do GitHub (ou pelo site), crie um repositório novo, público, sem README (ex: `minha-lista`).
2. Envie todos os arquivos desta pasta para esse repositório: `index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`.
   - Pelo celular: você pode fazer isso pelo app do GitHub usando "Add file > Upload files" no navegador, ou usando o GitHub Desktop / `git` no computador.

### Passo 5 — Ativar o GitHub Pages
1. No repositório, vá em **Settings > Pages**.
2. Em "Source", selecione a branch `main` e a pasta `/ (root)`. Salve.
3. Espere 1-2 minutos. O GitHub vai te dar um link tipo:
   `https://seu-usuario.github.io/minha-lista/`

### Passo 6 — Instalar no celular
1. Abra o link acima no navegador do celular (Chrome no Android, Safari no iPhone).
2. **Android (Chrome):** toque no menu ⋮ > "Adicionar à tela inicial" / "Instalar app".
3. **iPhone (Safari):** toque no ícone de compartilhar 􀈂 > "Adicionar à Tela de Início".
4. Pronto — o app abre em tela cheia, como um app nativo.

### Passo 7 — Compartilhar com o grupo
Envie o mesmo link (`https://seu-usuario.github.io/minha-lista/`) para as pessoas do grupo. Cada uma instala no celular dela e todo mundo edita a mesma lista, em tempo real.

## Nova aba: Casamento
Terceira tela do app (`wedding.html`) — cronograma de marcos organizados por mês, tipo "coisas a resolver antes do casamento". Cada item tem ano, mês, dia (opcional), título e uma nota livre para detalhes.

### Como atualizar seu repositório com essa novidade
1. No GitHub, **Add file > Upload files**
2. Envie estes arquivos — eles substituem os antigos: `index.html`, `habits.html`, `style.css`, `sw.js`
3. Envie também os novos: `wedding.html`, `wedding.js`
4. Confirme o commit
5. Atualize as **Regras** do Firestore (veja acima) para incluir `milestones`
6. Espere 1-2 min, feche o app no celular e abra de novo

## Nova aba: Hábitos
Agora o app tem duas telas, acessíveis pela navegação no topo:
- **Lista** (`index.html`) — o checklist original
- **Hábitos** (`habits.html`) — vários hábitos com calendário do mês; cada dia que alguém marca como feito aparece com a bolinha colorida da pessoa

### Como atualizar seu repositório com essa novidade
1. No GitHub, abra o repositório e vá em **Add file > Upload files** (ou use o link direto `https://github.com/SEU_USUARIO/minha-lista/upload/main`)
2. Envie estes arquivos — eles substituem os antigos automaticamente: `app.js`, `sw.js`, e envie também os novos: `habits.html`, `habits.js`, `firebase-config.js`
3. Confirme o commit
4. Atualize as **Regras** do Firestore (veja acima) para incluir `habits` e `habitLogs`
5. Espere 1-2 min e recarregue o app no celular — se ele já estava instalado, pode ser necessário fechar e abrir de novo para pegar a versão nova

## Personalizações fáceis
- **Título do app:** troque "Combinados" em `index.html` e "Lista Compartilhada" em `manifest.json`.
- **Cores:** todas as cores ficam no topo do arquivo `style.css`, em `:root`.
- **Várias listas separadas:** se no futuro quiser mais de uma lista (ex: "compras" e "casa"), me avise que ajudo a adicionar isso.
