#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="gen-lang-client-0365371352"
PROJECT_NUMBER="157712620388"
DATABASE_ID="ai-studio-bizerranetoadvoc-3ceabbf7-259b-4a9e-b48e-0ede91e287be"
RULES_FILE="${1:-firestore.rules}"
API_BASE="https://firebaserules.googleapis.com/v1"
ATTACHMENT_POINT="firestore.googleapis.com/projects/${PROJECT_NUMBER}/databases/${DATABASE_ID}"
RELEASE_NAME="projects/${PROJECT_ID}/releases/cloud.firestore/${DATABASE_ID}"
RELEASE_URL="${API_BASE}/${RELEASE_NAME}"

fail() {
  echo "ERRO: $*" >&2
  exit 1
}

for command_name in gcloud curl jq; do
  command -v "${command_name}" >/dev/null 2>&1 || fail "Comando obrigatório não encontrado: ${command_name}"
done

[[ -f "${RULES_FILE}" ]] || fail "Arquivo de regras não encontrado: ${RULES_FILE}"

echo "Projeto: ${PROJECT_ID}"
echo "Banco Firestore: ${DATABASE_ID}"
echo "Arquivo: ${RULES_FILE}"
echo

# Confirma que a conta ativa tem acesso ao projeto antes de criar um novo ruleset.
gcloud projects describe "${PROJECT_ID}" --format='value(projectId)' >/dev/null \
  || fail "A conta ativa do gcloud não possui acesso ao projeto ${PROJECT_ID}."

ACCESS_TOKEN="$(gcloud auth print-access-token)"
[[ -n "${ACCESS_TOKEN}" ]] || fail "Não foi possível obter access token da conta ativa do gcloud."

# Descobre a release atualmente ativa para permitir rollback manual se necessário.
CURRENT_RELEASE_FILE="$(mktemp)"
CURRENT_STATUS="$(curl -sS -o "${CURRENT_RELEASE_FILE}" -w '%{http_code}' \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${RELEASE_URL}")"

PREVIOUS_RULESET=""
if [[ "${CURRENT_STATUS}" == "200" ]]; then
  PREVIOUS_RULESET="$(jq -r '.rulesetName // empty' "${CURRENT_RELEASE_FILE}")"
  if [[ -n "${PREVIOUS_RULESET}" ]]; then
    echo "Ruleset atualmente publicado: ${PREVIOUS_RULESET}"
  fi
elif [[ "${CURRENT_STATUS}" != "404" ]]; then
  cat "${CURRENT_RELEASE_FILE}" >&2
  fail "Não foi possível consultar a release atual (HTTP ${CURRENT_STATUS})."
fi

RULESET_PAYLOAD="$(mktemp)"
jq -n \
  --rawfile content "${RULES_FILE}" \
  --arg attachmentPoint "${ATTACHMENT_POINT}" \
  '{
    source: {
      files: [
        {
          name: "firestore.rules",
          content: $content
        }
      ]
    },
    attachmentPoint: $attachmentPoint
  }' > "${RULESET_PAYLOAD}"

RULESET_RESPONSE="$(mktemp)"
echo "Validando e criando novo ruleset..."
curl --fail-with-body -sS \
  -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data-binary "@${RULESET_PAYLOAD}" \
  "${API_BASE}/projects/${PROJECT_ID}/rulesets" \
  -o "${RULESET_RESPONSE}" \
  || {
    cat "${RULESET_RESPONSE}" >&2 || true
    fail "A Rules API rejeitou o novo ruleset. A release ativa não foi alterada."
  }

NEW_RULESET="$(jq -r '.name // empty' "${RULESET_RESPONSE}")"
[[ -n "${NEW_RULESET}" ]] || {
  cat "${RULESET_RESPONSE}" >&2
  fail "A API não retornou o nome do ruleset criado."
}

echo "Novo ruleset válido: ${NEW_RULESET}"

if [[ "${CURRENT_STATUS}" == "200" ]]; then
  RELEASE_PAYLOAD="$(mktemp)"
  jq -n \
    --arg name "${RELEASE_NAME}" \
    --arg rulesetName "${NEW_RULESET}" \
    '{
      release: {
        name: $name,
        rulesetName: $rulesetName
      },
      updateMask: "rulesetName"
    }' > "${RELEASE_PAYLOAD}"

  echo "Atualizando a release do Firestore..."
  curl --fail-with-body -sS \
    -X PATCH \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H 'Content-Type: application/json' \
    --data-binary "@${RELEASE_PAYLOAD}" \
    "${RELEASE_URL}" \
    >/dev/null
else
  RELEASE_PAYLOAD="$(mktemp)"
  jq -n \
    --arg name "${RELEASE_NAME}" \
    --arg rulesetName "${NEW_RULESET}" \
    '{
      name: $name,
      rulesetName: $rulesetName
    }' > "${RELEASE_PAYLOAD}"

  echo "Criando a release do Firestore..."
  curl --fail-with-body -sS \
    -X POST \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H 'Content-Type: application/json' \
    --data-binary "@${RELEASE_PAYLOAD}" \
    "${API_BASE}/projects/${PROJECT_ID}/releases" \
    >/dev/null
fi

VERIFY_RESPONSE="$(mktemp)"
curl --fail-with-body -sS \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${RELEASE_URL}" \
  -o "${VERIFY_RESPONSE}"

PUBLISHED_RULESET="$(jq -r '.rulesetName // empty' "${VERIFY_RESPONSE}")"
[[ "${PUBLISHED_RULESET}" == "${NEW_RULESET}" ]] \
  || fail "A verificação final não encontrou o novo ruleset na release."

echo
echo "PUBLICAÇÃO CONCLUÍDA"
echo "Release: ${RELEASE_NAME}"
echo "Ruleset publicado: ${NEW_RULESET}"
if [[ -n "${PREVIOUS_RULESET}" ]]; then
  echo "Ruleset anterior (guarde para rollback): ${PREVIOUS_RULESET}"
fi
echo
echo "Observação: regras do Firebase podem levar alguns minutos para se propagar completamente."
