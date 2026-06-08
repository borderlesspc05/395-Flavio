# Firestore — regras para o app Magnus Mind (cliente)

O frontend grava diretamente no Firestore (SDK web). Sem regra para uma coleção, o SDK retorna **`permission-denied`** / *Missing or insufficient permissions*.

## Coleções usadas pelo cliente

| Coleção | Documento | Uso |
|---------|------------|-----|
| `initialForms` | `{uid}` | Human-to-Business Canvas |
| `blueprintGate` | `{uid}` | Gate Zero (caminho A/B) |
| `userWorkspace` | `{uid}` | Ciclo ativo selecionado |
| `diagnosticCycles` | ID automático | Histórico / ciclos de diagnóstico (`userId` no corpo do doc) |

> Objetivos, equipe, relatórios e IA passam pela **API Express** (Firebase Admin no servidor) — não precisam de regra no cliente, salvo se você ler essas coleções direto no app no futuro.

## Arquivo no repositório

As regras completas estão em [`firestore.rules`](../firestore.rules) na raiz do projeto.

## Publicar no Firebase Console (copiar e colar)

1. Abra [Firebase Console](https://console.firebase.google.com/) → projeto **magnusmind-d42ec** (ou o seu).
2. **Firestore Database** → aba **Regras**.
3. **Mescle** o conteúdo abaixo com regras que você já tenha (não apague outras coleções se existirem).

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /initialForms/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /blueprintGate/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /userWorkspace/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /diagnosticCycles/{cycleId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null
        && resource.data.userId == request.auth.uid
        && request.resource.data.userId == request.auth.uid;
    }

    match /conversations/{conversationId} {
      allow read, write: if request.auth != null
        && (resource == null || resource.data.userId == request.auth.uid)
        && (request.resource == null || request.resource.data.userId == request.auth.uid);
    }

    match /messages/{messageId} {
      allow read: if request.auth != null
        && exists(/databases/$(database)/documents/conversations/$(resource.data.conversationId))
        && get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.userId == request.auth.uid;

      allow create: if request.auth != null
        && exists(/databases/$(database)/documents/conversations/$(request.resource.data.conversationId))
        && get(/databases/$(database)/documents/conversations/$(request.resource.data.conversationId)).data.userId == request.auth.uid;

      allow update, delete: if request.auth != null
        && exists(/databases/$(database)/documents/conversations/$(resource.data.conversationId))
        && get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.userId == request.auth.uid;
    }
  }
}
```

4. Clique em **Publicar** e aguarde alguns segundos.

## Publicar via CLI (opcional)

```bash
npm install -g firebase-tools
firebase login
firebase use magnusmind-d42ec
firebase deploy --only firestore:rules
```

## Teste rápido

1. Recarregue o app (`Ctrl+Shift+R`) **logado**.
2. Abra o seletor de **ciclo** no topo do dashboard — deve listar sem erro.
3. **Novo ciclo** ou **limpar diagnóstico** — não deve aparecer *permission-denied*.
4. Confirme no Firestore: documentos em `diagnosticCycles` e `userWorkspace/{seuUid}`.

## Ainda com erro?

- Confirme que está **autenticado** (não em modo anônimo sem login).
- No Console → Firestore → **Regras**, verifique se não há um `match /{document=**}` no final negando tudo.
- Índices: consultas em `diagnosticCycles` com `where('userId', '==', uid)` não exigem índice composto; se o erro mencionar *index*, crie o índice pelo link do próprio erro.

---

*Ver também `DEPLOY.md` (secção Firebase).*
