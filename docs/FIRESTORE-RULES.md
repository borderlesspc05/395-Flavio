# Firestore — regras para o app Magnus Mind (cliente)

O frontend grava diretamente no Firestore:

| Coleção | Documento | Uso |
|---------|------------|-----|
| `initialForms` | `{uid}` | Human-to-Business Canvas |
| `blueprintGate` | `{uid}` | Gate Zero (caminho A/B) |

Se a regra não existir para `blueprintGate`, o SDK retorna **`permission-denied`** e o painel mostra erro ao confirmar o Gate Zero.

## Regra sugerida (mínima)

No **Firebase Console** → **Firestore Database** → **Regras**, inclua blocos equivalentes a:

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

    // …mantenha aqui as regras que você já usa para outras coleções
  }
}
```

**Importante:** se o projeto já tiver regras longas, **mescle** o bloco `blueprintGate` (e verifique `initialForms`) em vez de substituir tudo por este arquivo sozinho — caso contrário outras rotas podem parar de funcionar.

## Publicar

```bash
firebase deploy --only firestore:rules
```

(Exige CLI do Firebase logada no projeto `magnusmind-d42ec` ou o projeto que você usar.)

## Teste rápido

Após publicar, recarregue o app, conclua o diagnóstico, escolha Caminho A ou B e **Confirmar**. O documento `blueprintGate/{seuUid}` deve aparecer no Firestore sem erro.

---

*Ver também `DEPLOY.md` (secção Firebase).*
