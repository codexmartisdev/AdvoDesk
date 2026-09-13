#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="gen-lang-client-0365371352"
DATABASE_ID="ai-studio-bizerranetoadvoc-3ceabbf7-259b-4a9e-b48e-0ede91e287be"
RULES_FILE="firestore.rules"

fail() {
  echo "ERRO: $*" >&2
  exit 1
}

command -v firebase >/dev/null 2>&1 || fail "Firebase CLI não encontrado. No Cloud Shell ele normalmente já vem instalado."
[[ -f "${RULES_FILE}" ]] || fail "Arquivo de regras não encontrado: ${RULES_FILE}"
[[ -f "firebase.json" ]] || fail "firebase.json não encontrado no diretório atual."

echo "Projeto Firebase: ${PROJECT_ID}"
echo "Banco Firestore: ${DATABASE_ID}"
echo "Arquivo de regras: ${RULES_FILE}"
echo "Firebase CLI: $(firebase --version)"
echo

# Confirma que o Firebase CLI consegue enxergar os projetos da conta autenticada.
# Se a sessão não estiver autenticada, não tenta publicar nada.
if ! firebase projects:list --json >/tmp/advodesk-firebase-projects.json 2>/tmp/advodesk-firebase-auth-error.log; then
  cat /tmp/advodesk-firebase-auth-error.log >&2 || true
  echo >&2
  echo "A sessão do Firebase CLI não está autenticada ou não possui acesso aos projetos." >&2
  echo "Execute: firebase login --no-localhost" >&2
  echo "Depois execute este script novamente." >&2
  exit 1
fi

if ! jq -e --arg projectId "${PROJECT_ID}" '.result[]? | select(.projectId == $projectId)' /tmp/advodesk-firebase-projects.json >/dev/null 2>&1; then
  echo "ERRO: O projeto ${PROJECT_ID} não aparece entre os projetos acessíveis pela conta autenticada no Firebase CLI." >&2
  echo "Confira com: firebase projects:list" >&2
  exit 1
fi

echo "Conta autenticada com acesso ao projeto confirmado."
echo "Publicando somente as regras do banco Firestore nomeado..."
echo

firebase deploy \
  --only "firestore:${DATABASE_ID}" \
  --project "${PROJECT_ID}"

echo
echo "PUBLICAÇÃO CONCLUÍDA"
echo "Projeto: ${PROJECT_ID}"
echo "Banco: ${DATABASE_ID}"
echo "As regras definidas em ${RULES_FILE} foram enviadas pelo Firebase CLI."
