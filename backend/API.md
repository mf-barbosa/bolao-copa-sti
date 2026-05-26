# API - Bolão da Copa STI

Documentação das rotas do backend do projeto **Bolão da Copa STI**.

Base URL local:

```txt
http://localhost:3000
```

---

# 1. Visão geral do sistema

O sistema permite:

- cadastro e login de usuários por e-mail;
- autenticação com token JWT;
- separação entre usuário comum e administrador;
- criação de bolões por código;
- entrada de usuários em bolões;
- jogos globais da Copa do Mundo compartilhados por todos os bolões;
- importação de jogos reais via `matches2026.json`;
- identificação dos jogos por `match_number`;
- palpites separados por usuário, jogo e bolão;
- bloqueio de palpites 30 minutos antes da partida;
- controle global de status e horário dos jogos;
- lançamento global de resultado oficial por admin;
- cálculo automático de pontuação;
- ranking separado por bolão;
- progresso de palpites por grupo;
- painel administrativo para gerenciar bolões, participantes e jogos globais.

---

# 2. Conceito principal: jogos globais e bolões separados

Os jogos da Copa são **globais**. Isso significa que cada partida existe uma única vez na tabela `matches` e é compartilhada por todos os bolões.

Exemplo:

```txt
Jogo global:
match_id = 10
Brasil x Inglaterra
```

Esse mesmo jogo aparece em todos os bolões. O que muda de um bolão para outro são:

- participantes;
- palpites;
- pontos;
- ranking.

O palpite pertence à combinação:

```txt
user_id + match_id + pool_id
```

Isso permite que o mesmo usuário faça palpites diferentes para o mesmo jogo em bolões diferentes.

Exemplo:

```txt
Bolão STI:
Brasil 2 x 1 Inglaterra

Bolão Amigos:
Brasil 1 x 1 Inglaterra
```

Alterações feitas pelo admin em status, horário ou resultado de um jogo são globais e afetam todos os bolões.

---

# 3. Autenticação

Rotas protegidas usam token JWT no header:

```txt
Authorization: Bearer TOKEN_AQUI
```

Para requisições com body JSON, usar:

```txt
Content-Type: application/json
```

O token é retornado no login.

---

# 4. Tipos de usuário

## Usuário comum

Pode:

- criar conta;
- fazer login;
- entrar em bolões por código;
- visualizar seus bolões;
- selecionar um bolão;
- visualizar grupos e jogos;
- criar palpites;
- editar seus próprios palpites enquanto estiver liberado;
- visualizar ranking dos bolões em que participa;
- visualizar regras de pontuação.

## Administrador

Pode:

- criar bolões;
- listar todos os bolões;
- listar participantes de um bolão;
- remover usuário de um bolão;
- excluir bolões;
- listar usuários cadastrados;
- listar jogos globais;
- alterar status e horário dos jogos globais;
- lançar resultado oficial;
- recalcular pontuação ao lançar resultado;
- acessar a área `Gerenciar` no frontend.

---

# 5. Status dos jogos

Status aceitos:

```txt
scheduled
postponed
live
finished
cancelled
```

Uso esperado:

```txt
scheduled  → jogo marcado
postponed  → jogo adiado; palpites ficam reabertos
live       → jogo em andamento; palpites bloqueados
finished   → jogo finalizado; palpites bloqueados
cancelled  → jogo cancelado; palpites bloqueados
```

---

# 6. Regras de pontuação

```txt
Placar exato: 25 pontos
Vencedor + gols do vencedor: 18 pontos
Vencedor + diferença de gols: 15 pontos
Vencedor + gols do perdedor: 12 pontos
Apenas resultado correto: 10 pontos
Nenhum acerto: 0 pontos
```

Observações:

- Se o usuário errar vencedor/empate, recebe `0`.
- Em caso de empate, se o placar não for exato, mas o usuário acertar o empate, recebe `10`.
- A pontuação é calculada quando o admin lança o resultado oficial em `PUT /matches/:id/result`.

---

# 7. Rota inicial

## Verificar se o backend está rodando

```txt
GET /
```

Resposta esperada:

```json
{
  "message": "Backend do Bolão da Copa STI rodando!"
}
```

---

# 8. Usuários

## 8.1 Criar usuário comum

```txt
POST /users
```

Não requer token.

### Body

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "123456"
}
```

### Campos obrigatórios

```txt
name
email
password
```

### Observação sobre os campos

```txt
name  → nome/apelido exibido no bolão e ranking
email → usado para login
```

### Resposta de sucesso

```json
{
  "message": "Usuário criado com sucesso",
  "userId": 2
}
```

### Possível erro: e-mail já cadastrado

```json
{
  "error": "Este email já está em uso."
}
```

### Observação de segurança

Mesmo que o frontend envie `is_admin: 1`, o backend ignora e cria o usuário como comum.

Exemplo enviado:

```json
{
  "name": "Teste Admin Falso",
  "email": "adminfalso@email.com",
  "password": "123456",
  "is_admin": 1
}
```

Usuário salvo:

```json
{
  "is_admin": 0
}
```

---

## 8.2 Login

```txt
POST /users/login
```

Não requer token.

### Body

```json
{
  "email": "joao@email.com",
  "password": "123456"
}
```

### Campos obrigatórios

```txt
email
password
```

### Resposta de sucesso

```json
{
  "message": "Login realizado com sucesso",
  "token": "TOKEN_JWT_AQUI",
  "user": {
    "id": 2,
    "name": "João Silva",
    "email": "joao@email.com",
    "username": "joao@email.com",
    "is_admin": 0
  }
}
```

### Observação sobre `username`

O campo `username` pode aparecer como alias de compatibilidade, mas o login oficial do sistema é por `email`.

### Uso no frontend

Após o login, salvar:

```txt
token
user
```

O token deve ser enviado nas rotas protegidas:

```txt
Authorization: Bearer TOKEN_JWT_AQUI
```

---

## 8.3 Buscar usuário logado

```txt
GET /users/me
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_AQUI
```

### Resposta de sucesso

```json
{
  "user": {
    "id": 2,
    "name": "João Silva",
    "email": "joao@email.com",
    "username": "joao@email.com",
    "is_admin": 0
  }
}
```

### Uso no frontend

Essa rota serve para:

- confirmar se o token ainda é válido;
- saber quem está logado;
- atualizar os dados do usuário no frontend;
- saber se o usuário é admin;
- mostrar ou esconder a aba `Gerenciar`.

---

## 8.4 Listar usuários

```txt
GET /users
```

Requer token de admin.

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
```

### Resposta de sucesso

```json
[
  {
    "id": 1,
    "name": "Matheus Barbosa",
    "email": "matheus@email.com",
    "username": "matheus@email.com",
    "is_admin": 0
  },
  {
    "id": 3,
    "name": "Administrador STI",
    "email": "admin@email.com",
    "username": "admin@email.com",
    "is_admin": 1
  }
]
```

---

# 9. Bolões

## 9.1 Criar bolão

```txt
POST /pools
```

Requer token de admin.

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

### Body

```json
{
  "name": "Bolão STI",
  "code": "STI2026"
}
```

### Campos obrigatórios

```txt
name
code
```

### Resposta de sucesso

```json
{
  "message": "Bolão criado com sucesso.",
  "pool": {
    "id": 1,
    "name": "Bolão STI",
    "code": "STI2026",
    "created_by_admin_id": 3
  }
}
```

### Observação

O código do bolão é normalizado para maiúsculas.

Exemplo:

```txt
sti2026 → STI2026
```

Criar um bolão não adiciona automaticamente o administrador como participante. Para participar, o admin deve usar o código no fluxo normal de entrada.

---

## 9.2 Entrar em bolão por código

```txt
POST /pools/join
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
Content-Type: application/json
```

### Body

```json
{
  "code": "STI2026"
}
```

### Campos obrigatórios

```txt
code
```

### Resposta de sucesso

```json
{
  "message": "Usuário entrou no bolão com sucesso.",
  "pool": {
    "id": 1,
    "name": "Bolão STI",
    "code": "STI2026"
  }
}
```

### Possíveis erros

Usuário já participa do bolão:

```json
{
  "error": "Usuário já participa deste bolão.",
  "poolId": 1
}
```

Bolão não encontrado:

```json
{
  "error": "Bolão não encontrado."
}
```

---

## 9.3 Listar meus bolões

```txt
GET /pools/me
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
```

### Resposta de sucesso

```json
[
  {
    "id": 1,
    "name": "Bolão STI",
    "code": "STI2026",
    "created_by_admin_id": 3,
    "created_at": "2026-05-10 14:30:00"
  }
]
```

### Uso no frontend

Essa rota deve ser usada para a tela de entrada/seleção de bolão.

---

## 9.4 Listar todos os bolões

```txt
GET /pools
```

Requer token de admin.

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
```

### Resposta de sucesso

```json
[
  {
    "id": 1,
    "name": "Bolão STI",
    "code": "STI2026",
    "created_by_admin_id": 3,
    "created_at": "2026-05-10 14:30:00",
    "participants_count": 2
  }
]
```

---

## 9.5 Listar participantes de um bolão

```txt
GET /pools/:poolId/users
```

Requer token de admin.

### Exemplo

```txt
GET /pools/1/users
```

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
```

### Resposta de sucesso

```json
{
  "pool": {
    "id": 1,
    "name": "Bolão STI",
    "code": "STI2026"
  },
  "participants": [
    {
      "id": 2,
      "name": "João Silva",
      "email": "joao@email.com",
      "is_admin": 0
    },
    {
      "id": 3,
      "name": "Administrador STI",
      "email": "admin@email.com",
      "is_admin": 1
    }
  ]
}
```

### Uso no frontend

Essa rota alimenta a seção de participantes do painel `Gerenciar`.

---

## 9.6 Remover usuário de um bolão

```txt
DELETE /pools/:poolId/users/:userId
```

Requer token de admin.

### Exemplo

```txt
DELETE /pools/1/users/2
```

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
```

### Resposta de sucesso

```json
{
  "message": "Usuário removido do bolão com sucesso."
}
```

### Efeitos dessa rota

Ao remover um usuário de um bolão:

- o vínculo do usuário com aquele bolão é removido;
- os palpites desse usuário naquele bolão são removidos;
- o usuário continua existindo no sistema;
- outros bolões do usuário não são afetados.

---

## 9.7 Excluir bolão

```txt
DELETE /pools/:poolId
```

Requer token de admin.

### Exemplo

```txt
DELETE /pools/1
```

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
```

### Resposta de sucesso

```json
{
  "message": "Bolão excluído com sucesso."
}
```

### Efeitos dessa rota

Ao excluir um bolão:

- os participantes daquele bolão são removidos;
- os palpites daquele bolão são removidos;
- o bolão é removido;
- usuários não são excluídos;
- jogos globais não são excluídos.

---

# 10. Jogos globais

Os jogos são globais. Ou seja, todos os bolões usam os mesmos jogos.

Os palpites e rankings são separados por bolão.

## Campos usados pelo sistema

O sistema usa apenas estes campos principais dos jogos:

```txt
match_number
home_team
away_team
match_date
group_name
status
home_score
away_score
```

### `match_number`

O campo `match_number` representa a ordem oficial/cronológica dos jogos.

Exemplo:

```txt
match_number = 1  → primeiro jogo da Copa
match_number = 2  → segundo jogo da Copa
match_number = 3  → terceiro jogo da Copa
```

Quando dois jogos acontecem no mesmo horário, o `match_number` segue a ordem definida na tabela importada.

---

## 10.1 Listar todos os jogos

```txt
GET /matches
```

Não requer token.

### Resposta de sucesso

```json
[
  {
    "id": 1,
    "match_number": 1,
    "home_team": "México",
    "away_team": "África do Sul",
    "match_date": "2026-06-11 16:00",
    "group_name": "A",
    "status": "scheduled",
    "home_score": null,
    "away_score": null
  }
]
```

### Ordenação

A listagem vem ordenada por:

```txt
match_number ASC
match_date ASC
```

Jogos sem `match_number` ficam no final.

---

## 10.2 Filtrar jogos por grupo

```txt
GET /matches?group_name=A
```

Não requer token.

### Exemplo

```txt
GET /matches?group_name=B
```

---

## 10.3 Filtrar jogos por status

```txt
GET /matches?status=scheduled
```

Não requer token.

### Exemplo

```txt
GET /matches?status=finished
```

---

## 10.4 Filtrar jogos por grupo e status

```txt
GET /matches?group_name=A&status=scheduled
```

Não requer token.

---

## 10.5 Resumo dos grupos

```txt
GET /matches/groups
```

Não requer token.

### Resposta de sucesso

```json
[
  {
    "group_name": "A",
    "matches_count": 6,
    "scheduled_count": 6,
    "postponed_count": 0,
    "live_count": 0,
    "finished_count": 0,
    "cancelled_count": 0
  },
  {
    "group_name": "B",
    "matches_count": 6,
    "scheduled_count": 4,
    "postponed_count": 0,
    "live_count": 0,
    "finished_count": 2,
    "cancelled_count": 0
  }
]
```

### Uso no frontend

Pode ser usado para mostrar resumo geral dos grupos.

---

## 10.6 Progresso de palpites por grupo

```txt
GET /matches/groups/progress?pool_id=1
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
```

### Query obrigatória

```txt
pool_id
```

### Resposta de sucesso

```json
{
  "pool": {
    "id": 1,
    "name": "Bolão STI",
    "code": "STI2026"
  },
  "progress": [
    {
      "group_name": "A",
      "matches_count": 6,
      "predictions_count": 4,
      "missing_predictions_count": 2,
      "scheduled_count": 6,
      "postponed_count": 0,
      "live_count": 0,
      "finished_count": 0,
      "cancelled_count": 0,
      "completed": false
    }
  ]
}
```

### Uso no frontend

Essa rota serve para a tela compacta dos grupos.

---

## 10.7 Listar jogos de um grupo com palpites do usuário

```txt
GET /matches/group/:groupName?pool_id=1
```

Requer token.

### Exemplo

```txt
GET /matches/group/A?pool_id=1
```

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
```

### Query obrigatória

```txt
pool_id
```

### Resposta de sucesso

```json
{
  "pool": {
    "id": 1,
    "name": "Bolão STI",
    "code": "STI2026"
  },
  "group_name": "A",
  "matches": [
    {
      "id": 1,
      "match_number": 1,
      "home_team": "México",
      "away_team": "África do Sul",
      "match_date": "2026-06-11 16:00",
      "group_name": "A",
      "home_score": null,
      "away_score": null,
      "status": "scheduled",
      "can_predict": true,
      "prediction_locked_reason": null,
      "prediction": {
        "id": 4,
        "predicted_home_score": 2,
        "predicted_away_score": 0,
        "points": 0,
        "created_at": "2026-05-06 17:12:53"
      }
    },
    {
      "id": 2,
      "match_number": 2,
      "home_team": "Espanha",
      "away_team": "Cabo Verde",
      "match_date": "2026-06-11 19:00",
      "group_name": "B",
      "home_score": null,
      "away_score": null,
      "status": "scheduled",
      "can_predict": true,
      "prediction_locked_reason": null,
      "prediction": null
    }
  ]
}
```

### Uso no frontend

Essa rota retorna:

- dados do jogo global;
- `match_number`;
- status do jogo;
- se o usuário ainda pode palpitar;
- motivo do bloqueio, caso esteja bloqueado;
- palpite existente do usuário naquele bolão, se houver.

---

## 10.8 Criar jogo manualmente

```txt
POST /matches
```

Requer token de admin.

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

### Body

```json
{
  "match_number": 1,
  "home_team": "México",
  "away_team": "África do Sul",
  "match_date": "2026-06-11 16:00",
  "group_name": "A"
}
```

### Campos obrigatórios

```txt
home_team
away_team
match_date
group_name
```

### Campo opcional

```txt
match_number
```

### Resposta de sucesso

```json
{
  "message": "Jogo criado com sucesso.",
  "matchId": 1
}
```

### Observação

A rota existe, mas o fluxo recomendado não é cadastrar todos os jogos manualmente. O fluxo recomendado é importar os jogos reais pelo arquivo `matches2026.json` usando o script de seed.

---

## 10.9 Atualizar resultado oficial do jogo

```txt
PUT /matches/:id/result
```

Requer token de admin.

### Exemplo

```txt
PUT /matches/1/result
```

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

### Body

```json
{
  "home_score": 2,
  "away_score": 1
}
```

### Campos obrigatórios

```txt
home_score
away_score
```

### Resposta de sucesso

Se houver palpites:

```json
{
  "message": "Resultado atualizado, jogo finalizado e pontuações calculadas."
}
```

Se não houver palpites:

```json
{
  "message": "Resultado atualizado, jogo finalizado e nenhum palpite encontrado para pontuar."
}
```

### Efeitos dessa rota

Ao lançar resultado:

- salva o placar oficial;
- muda o status do jogo para `finished`;
- calcula os pontos de todos os palpites daquele `match_id`;
- recalcula pontuação em todos os bolões que possuem palpites para esse jogo;
- bloqueia novos palpites;
- bloqueia edição de palpites.

### Importante

Essa alteração é global. O resultado lançado para um jogo vale para todos os bolões.

---

## 10.10 Atualizar status e horário do jogo

```txt
PUT /matches/:id/status
```

Requer token de admin.

### Exemplo

```txt
PUT /matches/1/status
```

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

### Body para alterar apenas status

```json
{
  "status": "postponed"
}
```

### Body para remarcar jogo

```json
{
  "status": "scheduled",
  "match_date": "2026-06-20 18:00"
}
```

### Status aceitos

```txt
scheduled
postponed
live
finished
cancelled
```

### Resposta de sucesso

```json
{
  "message": "Status do jogo atualizado com sucesso."
}
```

### Importante

Essa alteração é global. Alterar status ou horário de um jogo afeta todos os bolões.

---

# 11. Palpites

## Regra principal

O palpite pertence a:

```txt
user_id + match_id + pool_id
```

Isso permite que o mesmo usuário faça palpites diferentes para o mesmo jogo em bolões diferentes.

---

## 11.1 Criar palpite

```txt
POST /predictions
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
Content-Type: application/json
```

### Body

```json
{
  "match_id": 1,
  "pool_id": 1,
  "predicted_home_score": 2,
  "predicted_away_score": 1
}
```

### Campos obrigatórios

```txt
match_id
pool_id
predicted_home_score
predicted_away_score
```

### Validação dos placares

Os campos `predicted_home_score` e `predicted_away_score` devem ser:

```txt
obrigatórios
números inteiros
maiores ou iguais a 0
menores ou iguais a 99
```

Exemplos inválidos:

```json
{
  "predicted_home_score": -1,
  "predicted_away_score": 2
}
```

```json
{
  "predicted_home_score": 1.5,
  "predicted_away_score": 2
}
```

```json
{
  "predicted_home_score": "abc",
  "predicted_away_score": 2
}
```

### Resposta de sucesso

```json
{
  "message": "Palpite criado com sucesso.",
  "predictionId": 4
}
```

### Regras

- usuário precisa estar logado;
- usuário precisa participar do bolão;
- usuário só pode ter um palpite por jogo dentro do mesmo bolão;
- palpite é bloqueado 30 minutos antes do jogo;
- jogo finalizado não aceita novo palpite;
- jogo `postponed` permite edição/criação de palpite.

### Erro de duplicidade

```json
{
  "error": "Este usuário já fez um palpite para este jogo neste bolão. Edite o palpite existente.",
  "predictionId": 4
}
```

---

## 11.2 Listar palpites

```txt
GET /predictions
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
```

### Comportamento

```txt
Admin vê todos os palpites.
Usuário comum vê apenas os próprios palpites.
```

### Filtro por bolão

```txt
GET /predictions?pool_id=1
```

### Resposta de sucesso

```json
[
  {
    "id": 4,
    "user_id": 2,
    "user_name": "João Silva",
    "user_email": "joao@email.com",
    "match_id": 1,
    "pool_id": 1,
    "pool_name": "Bolão STI",
    "pool_code": "STI2026",
    "home_team": "Brasil",
    "away_team": "Argentina",
    "match_date": "2026-06-10 16:00",
    "group_name": "A",
    "match_status": "scheduled",
    "home_score": null,
    "away_score": null,
    "predicted_home_score": 2,
    "predicted_away_score": 1,
    "points": 0,
    "created_at": "2026-05-06 17:12:53"
  }
]
```

---

## 11.3 Listar meus palpites

```txt
GET /predictions/me
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
```

### Filtro por bolão

```txt
GET /predictions/me?pool_id=1
```

### Resposta de sucesso

```json
[
  {
    "id": 4,
    "user_id": 2,
    "user_name": "João Silva",
    "user_email": "joao@email.com",
    "match_id": 1,
    "pool_id": 1,
    "pool_name": "Bolão STI",
    "pool_code": "STI2026",
    "home_team": "Brasil",
    "away_team": "Argentina",
    "match_date": "2026-06-10 16:00",
    "group_name": "A",
    "match_status": "scheduled",
    "home_score": null,
    "away_score": null,
    "predicted_home_score": 2,
    "predicted_away_score": 1,
    "points": 0,
    "created_at": "2026-05-06 17:12:53"
  }
]
```

---

## 11.4 Editar palpite

```txt
PUT /predictions/:id
```

Requer token.

### Exemplo

```txt
PUT /predictions/4
```

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
Content-Type: application/json
```

### Body

```json
{
  "predicted_home_score": 1,
  "predicted_away_score": 0
}
```

### Campos obrigatórios

```txt
predicted_home_score
predicted_away_score
```

### Validação dos placares

Os campos `predicted_home_score` e `predicted_away_score` devem ser:

```txt
obrigatórios
números inteiros
maiores ou iguais a 0
menores ou iguais a 99
```

### Resposta de sucesso

```json
{
  "message": "Palpite atualizado com sucesso."
}
```

### Regras

- usuário comum só edita o próprio palpite;
- admin pode editar qualquer palpite;
- não permite editar se o jogo estiver finalizado;
- não permite editar se faltar 30 minutos ou menos para o jogo;
- ao editar, os pontos voltam para `0` até novo resultado ser lançado.

---

# 12. Ranking

## 12.1 Ranking global

```txt
GET /ranking
```

Rota antiga/global.

Não é a rota principal para o frontend final, porque agora o sistema trabalha com bolões.

### Resposta de sucesso

```json
[
  {
    "id": 2,
    "name": "João Silva",
    "email": "joao@email.com",
    "total_points": 50
  }
]
```

---

## 12.2 Ranking por bolão

```txt
GET /ranking/:poolId
```

Requer token.

### Exemplo

```txt
GET /ranking/1
```

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
```

### Resposta de sucesso

```json
{
  "pool": {
    "id": 1,
    "name": "Bolão STI",
    "code": "STI2026"
  },
  "ranking": [
    {
      "id": 2,
      "name": "João Silva",
      "email": "joao@email.com",
      "total_points": 50
    },
    {
      "id": 3,
      "name": "Administrador STI",
      "email": "admin@email.com",
      "total_points": 0
    }
  ]
}
```

### Regras

- usuário comum precisa participar do bolão;
- admin pode visualizar qualquer ranking;
- ranking soma apenas os pontos daquele bolão.

---

# 13. Importação de jogos reais da Copa 2026

O projeto importa jogos por arquivo JSON.

## Arquivo de dados

```txt
backend/src/data/matches2026.json
```

## Formato de cada jogo no JSON

```json
{
  "match_number": 1,
  "home_team": "México",
  "away_team": "África do Sul",
  "match_date": "2026-06-11 16:00",
  "group_name": "A",
  "status": "scheduled",
  "home_score": null,
  "away_score": null
}
```

## Campos obrigatórios

```txt
match_number
home_team
away_team
match_date
group_name
```

## Campos opcionais

```txt
status
home_score
away_score
```

Se `status` não for enviado, o script considera:

```txt
scheduled
```

## Regra do `match_number`

O campo `match_number` é único e representa a ordem oficial/cronológica dos jogos.

Se o script for rodado novamente com o mesmo `match_number`, ele atualiza o jogo existente em vez de duplicar.

## Script de importação

```txt
backend/src/scripts/seedMatches2026.js
```

Rodar dentro da pasta `backend`:

```bash
node src/scripts/seedMatches2026.js
```

## Script de limpeza dos jogos

```txt
backend/src/scripts/resetMatches.js
```

Rodar dentro da pasta `backend`:

```bash
node src/scripts/resetMatches.js
```

Esse script apaga:

- jogos;
- palpites vinculados aos jogos.

Esse script mantém:

- usuários;
- bolões;
- participantes dos bolões.

## Script para limpar resultado de um jogo específico

```txt
backend/src/scripts/clearMatchResult.js
```

Rodar dentro da pasta `backend`:

```bash
node src/scripts/clearMatchResult.js NUMERO_DO_JOGO
```

Exemplo:

```bash
node src/scripts/clearMatchResult.js 1
```

Esse script:

- busca o jogo por `match_number`;
- remove `home_score`;
- remove `away_score`;
- muda o status para `scheduled`;
- zera os pontos dos palpites daquele jogo.

---

# 14. Fluxo principal para o usuário

```txt
1. Usuário cria conta com name, email e password
2. Usuário faz login com email e password
3. Frontend salva token e user
4. Frontend consulta GET /users/me
5. Usuário entra em um bolão por código
6. Frontend lista os bolões do usuário
7. Usuário seleciona um bolão
8. Frontend carrega progresso dos grupos com pool_id
9. Usuário escolhe um grupo
10. Frontend lista jogos globais do grupo com palpites daquele bolão
11. Usuário cria ou edita palpites
12. Admin lança resultados globais
13. Sistema calcula pontuação
14. Ranking do bolão é atualizado
```

---

# 15. Fluxo principal para o admin

```txt
1. Admin faz login com email e password
2. Frontend identifica is_admin = 1
3. Admin acessa Gerenciar
4. Admin cria bolões
5. Admin lista participantes de bolões
6. Admin remove participantes de bolões quando necessário
7. Admin exclui bolões de teste ou inválidos
8. Admin visualiza jogos globais importados
9. Admin altera status/horário dos jogos globais
10. Admin lança resultado oficial
11. Backend recalcula pontuação dos palpites em todos os bolões
```

---

# 16. Erros comuns

## Token não enviado

```json
{
  "error": "Token não informado."
}
```

## Formato de token inválido

```json
{
  "error": "Formato do token inválido."
}
```

## Token inválido ou expirado

```json
{
  "error": "Token inválido ou expirado."
}
```

## Usuário sem permissão de admin

```json
{
  "error": "Acesso negado. Apenas administradores podem executar esta ação."
}
```

## Usuário fora do bolão

```json
{
  "error": "Usuário não participa deste bolão."
}
```

## Bolão não encontrado

```json
{
  "error": "Bolão não encontrado."
}
```

## Jogo não encontrado

```json
{
  "error": "Jogo não encontrado."
}
```

## Palpite duplicado

```json
{
  "error": "Este usuário já fez um palpite para este jogo neste bolão. Edite o palpite existente.",
  "predictionId": 4
}
```

## Palpite bloqueado pelo horário

```json
{
  "error": "Palpites encerrados para este jogo. O limite é 30 minutos antes da partida."
}
```

## Palpite bloqueado por status do jogo

```json
{
  "error": "Não é possível palpitar neste jogo por causa do status atual."
}
```

## Placar inválido em palpite

```json
{
  "error": "predicted_home_score deve ser um número inteiro entre 0 e 99."
}
```

Também pode retornar mensagens específicas como:

```json
{
  "error": "predicted_home_score não pode ser negativo."
}
```

```json
{
  "error": "predicted_away_score deve ser menor ou igual a 99."
}
```

## Status inválido

```json
{
  "error": "Status inválido. Use um destes: scheduled, postponed, live, finished, cancelled."
}
```

---

# 17. Endpoints mais importantes para o Frontend MVP

## Login

```txt
POST /users/login
```

## Cadastro

```txt
POST /users
```

## Usuário logado

```txt
GET /users/me
```

## Entrar em bolão

```txt
POST /pools/join
```

## Meus bolões

```txt
GET /pools/me
```

## Listar bolões admin

```txt
GET /pools
```

## Listar participantes de bolão

```txt
GET /pools/:poolId/users
```

## Remover participante de bolão

```txt
DELETE /pools/:poolId/users/:userId
```

## Excluir bolão

```txt
DELETE /pools/:poolId
```

## Listar jogos globais

```txt
GET /matches
```

## Atualizar status/horário global de jogo

```txt
PUT /matches/:id/status
```

## Lançar resultado oficial global

```txt
PUT /matches/:id/result
```

## Progresso dos grupos

```txt
GET /matches/groups/progress?pool_id=1
```

## Jogos de um grupo com palpites

```txt
GET /matches/group/A?pool_id=1
```

## Criar palpite

```txt
POST /predictions
```

## Editar palpite

```txt
PUT /predictions/:id
```

## Ranking do bolão

```txt
GET /ranking/:poolId
```

---

# 18. Observações para o frontend

## Token

Após login, salvar o token e enviar em rotas protegidas:

```txt
Authorization: Bearer TOKEN_AQUI
```

## Usuário logado

Após login, salvar o usuário retornado.

O usuário vem com:

```txt
id
name
email
username
is_admin
```

`username` é apenas alias de compatibilidade para o e-mail.

## Bolão selecionado

Após o usuário selecionar um bolão, guardar o `pool_id`.

Esse `pool_id` será usado em várias rotas:

```txt
GET /matches/groups/progress?pool_id=1
GET /matches/group/A?pool_id=1
GET /predictions/me?pool_id=1
GET /ranking/1
POST /predictions
```

## Usuário admin

Usar `is_admin` vindo de:

```txt
POST /users/login
GET /users/me
```

Para mostrar ou esconder a aba:

```txt
Gerenciar
```

## Grupos da Copa 2026

A fase de grupos da Copa 2026 usa grupos de `A` até `L`.

## Jogos globais no admin

A tela `Gerenciar` não deve pedir `pool_id` para editar jogos, porque jogos são globais.

As telas dos usuários usam `pool_id` porque precisam misturar:

```txt
jogos globais + palpites daquele bolão
```

---

# 19. Checklist de integração do frontend

```txt
[x] Criar tela de cadastro usando POST /users
[x] Criar tela de login usando POST /users/login
[x] Salvar token após login
[x] Consultar GET /users/me ao carregar a aplicação
[x] Criar tela para entrar em bolão por código
[x] Listar bolões com GET /pools/me
[x] Guardar pool_id selecionado
[x] Carregar progresso dos grupos
[x] Abrir tela de jogos por grupo
[x] Criar palpites
[x] Editar palpites
[x] Exibir ranking por bolão
[x] Exibir regras de pontuação
[x] Mostrar menu Gerenciar apenas para admin
[x] Listar bolões no painel admin
[x] Listar participantes de bolões no painel admin
[x] Remover participante de bolão
[x] Excluir bolão
[x] Importar jogos reais por seed
[x] Listar jogos globais no painel admin
[x] Alterar status e horário de jogos globais
[x] Lançar resultado oficial e recalcular pontuação
```
