# API - Bolão da Copa STI

Documentação das rotas do backend do projeto **Bolão da Copa STI**.

Base URL local:

```txt
http://localhost:3000
```

---

# 1. Visão geral do sistema

O sistema permite:

- cadastro e login de usuários;
- autenticação com token JWT;
- separação entre usuário comum e administrador;
- criação de bolões por código;
- entrada de usuários em bolões;
- jogos globais da Copa do Mundo;
- palpites por usuário, jogo e bolão;
- bloqueio de palpites 30 minutos antes da partida;
- controle de status dos jogos;
- lançamento de resultados por admin;
- cálculo automático de pontuação;
- ranking separado por bolão;
- progresso de palpites por grupo;
- listagem de jogos por grupo com palpite do usuário.

---

# 2. Autenticação

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

# 3. Tipos de usuário

## Usuário comum

Pode:

- criar conta;
- fazer login;
- entrar em bolões por código;
- criar palpites;
- editar seus próprios palpites enquanto estiver liberado;
- visualizar seus bolões;
- visualizar ranking dos bolões em que participa.

## Administrador

Pode:

- criar jogos;
- lançar resultados;
- alterar status dos jogos;
- criar bolões;
- listar todos os bolões;
- listar usuários;
- acessar rotas administrativas.

---

# 4. Status dos jogos

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
postponed  → jogo adiado, palpites ficam reabertos
live       → jogo em andamento, palpites bloqueados
finished   → jogo finalizado, palpites bloqueados
cancelled  → jogo cancelado, palpites bloqueados
```

---

# 5. Regras de pontuação

```txt
Placar exato: 25 pontos
Vencedor + gols do vencedor: 18 pontos
Vencedor + diferença de gols: 15 pontos
Vencedor + gols do perdedor: 12 pontos
Apenas resultado correto: 10 pontos
Nenhum acerto: 0 pontos
```

---

# 6. Rota inicial

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

# 7. Usuários

## 7.1 Criar usuário comum

```txt
POST /users
```

Não requer token.

### Body

```json
{
  "name": "João Silva",
  "username": "joao",
  "password": "123456"
}
```

### Campos obrigatórios

```txt
name
username
password
```

### Resposta de sucesso

```json
{
  "message": "Usuário criado com sucesso",
  "userId": 2
}
```

### Observação

Mesmo que o frontend envie `is_admin: 1`, o backend ignora e cria o usuário como comum.

Exemplo enviado:

```json
{
  "name": "Teste Admin Falso",
  "username": "adminfalso",
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

## 7.2 Login

```txt
POST /users/login
```

Não requer token.

### Body

```json
{
  "username": "joao",
  "password": "123456"
}
```

### Campos obrigatórios

```txt
username
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
    "username": "joao",
    "is_admin": 0
  }
}
```

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

## 7.3 Buscar usuário logado

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
    "username": "joao",
    "is_admin": 0
  }
}
```

### Uso no frontend

Essa rota serve para:

- confirmar se o token ainda é válido;
- saber quem está logado;
- saber se o usuário é admin;
- mostrar ou esconder a aba `Gerenciar`.

---

## 7.4 Listar usuários

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
    "username": "matheus",
    "is_admin": 0
  },
  {
    "id": 3,
    "name": "Administrador STI",
    "username": "admin",
    "is_admin": 1
  }
]
```

---

# 8. Bolões

## 8.1 Criar bolão

```txt
POST /pools
```

Requer token de admin.

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
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

---

## 8.2 Entrar em bolão por código

```txt
POST /pools/join
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
```

### Body

```json
{
  "code": "STI2026"
}
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

## 8.3 Listar meus bolões

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

Essa rota deve ser usada para a tela de seleção de bolão.

---

## 8.4 Listar todos os bolões

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

# 9. Jogos

Os jogos são globais. Ou seja, todos os bolões usam os mesmos jogos.

Os palpites e rankings são separados por bolão.

---

## 9.1 Listar todos os jogos

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
    "home_team": "Brasil",
    "away_team": "Argentina",
    "match_date": "2026-06-10 16:00",
    "group_name": "A",
    "stage": "group_stage",
    "stadium": "MetLife Stadium",
    "city": "New York/New Jersey",
    "country": "Estados Unidos",
    "home_score": null,
    "away_score": null,
    "status": "scheduled"
  }
]
```

---

## 9.2 Filtrar jogos por grupo

```txt
GET /matches?group_name=A
```

Não requer token.

### Exemplo

```txt
GET /matches?group_name=B
```

---

## 9.3 Filtrar jogos por status

```txt
GET /matches?status=scheduled
```

Não requer token.

### Exemplo

```txt
GET /matches?status=finished
```

---

## 9.4 Filtrar jogos por grupo e status

```txt
GET /matches?group_name=A&status=scheduled
```

Não requer token.

---

## 9.5 Resumo dos grupos

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

## 9.6 Progresso de palpites por grupo

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

Exemplo visual:

```txt
Grupo A — 4/6 palpites feitos
Grupo B — 6/6 palpites feitos
Grupo C — 0/6 palpites feitos
```

---

## 9.7 Listar jogos de um grupo com palpites do usuário

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
      "home_team": "Brasil",
      "away_team": "Argentina",
      "match_date": "2026-06-10 16:00",
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
      "home_team": "França",
      "away_team": "Alemanha",
      "match_date": "2026-06-11 13:00",
      "group_name": "A",
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

Essa é uma das rotas mais importantes para a tela de palpites por grupo.

Ela retorna:

- dados do jogo;
- status do jogo;
- se o usuário ainda pode palpitar;
- motivo do bloqueio, caso esteja bloqueado;
- palpite existente do usuário, se houver.

---

## 9.8 Criar jogo

```txt
POST /matches
```

Requer token de admin.

### Header

```txt
Authorization: Bearer TOKEN_ADMIN
```

### Body

```json
{
  "home_team": "Brasil",
  "away_team": "Argentina",
  "match_date": "2026-06-10 16:00",
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

### Resposta de sucesso

```json
{
  "message": "Jogo criado com sucesso.",
  "matchId": 1
}
```

---

## 9.9 Atualizar resultado do jogo

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

- salva o placar;
- muda o status do jogo para `finished`;
- calcula os pontos dos palpites daquele jogo;
- bloqueia novos palpites;
- bloqueia edição de palpites.

---

## 9.10 Atualizar status do jogo

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
```

### Body para adiar jogo

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

### Resposta de sucesso

```json
{
  "message": "Status do jogo atualizado com sucesso."
}
```

---

# 10. Palpites

## Regra principal

O palpite pertence a:

```txt
user_id + match_id + pool_id
```

Isso permite que o mesmo usuário faça palpites diferentes para o mesmo jogo em bolões diferentes.

Exemplo:

```txt
João no Bolão STI:
Brasil 2 x 1 Argentina

João no Bolão Amigos:
Brasil 1 x 1 Argentina
```

---

## 10.1 Criar palpite

```txt
POST /predictions
```

Requer token.

### Header

```txt
Authorization: Bearer TOKEN_USUARIO
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

## 10.2 Listar palpites

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
    "username": "joao",
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

## 10.3 Listar meus palpites

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
    "username": "joao",
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

## 10.4 Editar palpite

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

# 11. Ranking

## 11.1 Ranking global

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
    "username": "joao",
    "total_points": 50
  }
]
```

---

## 11.2 Ranking por bolão

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
      "username": "joao",
      "total_points": 50
    },
    {
      "id": 3,
      "name": "Administrador STI",
      "username": "admin",
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

# 12. Importação de jogos reais da Copa 2026

O projeto está preparado para importar jogos por arquivo.

## Arquivo de dados

```txt
backend/src/data/matches2026.json
```

Formato atual quando vazio:

```json
[]
```

## Script de importação

```txt
backend/src/database/seedMatches2026.js
```

Rodar dentro da pasta `backend`:

```bash
node src/database/seedMatches2026.js
```

## Formato de cada jogo no JSON

```json
{
  "match_number": 1,
  "home_team": "México",
  "away_team": "A definir",
  "match_date": "2026-06-11 16:00",
  "group_name": "A",
  "stage": "group_stage",
  "stadium": "Estádio Azteca",
  "city": "Cidade do México",
  "country": "México",
  "status": "scheduled"
}
```

## Campos obrigatórios

```txt
match_number
home_team
away_team
match_date
group_name
stage
stadium
city
country
```

## Observação

O campo `match_number` é único. Se o script for rodado novamente com o mesmo `match_number`, ele atualiza o jogo existente em vez de duplicar.

---

# 13. Fluxo principal para o usuário

```txt
1. Usuário cria conta
2. Usuário faz login
3. Frontend salva token
4. Frontend consulta GET /users/me
5. Usuário entra em um bolão por código
6. Frontend lista os bolões do usuário
7. Usuário seleciona um bolão
8. Frontend carrega progresso dos grupos
9. Usuário escolhe um grupo
10. Frontend lista jogos do grupo com palpites
11. Usuário cria ou edita palpites
12. Admin lança resultados
13. Sistema calcula pontuação
14. Ranking do bolão é atualizado
```

---

# 14. Fluxo principal para o admin

```txt
1. Admin faz login
2. Frontend identifica is_admin = 1
3. Admin cria bolões
4. Admin cria/importa jogos
5. Admin altera status de jogos quando necessário
6. Admin lança resultados
7. Sistema calcula pontuação automaticamente
```

---

# 15. Erros comuns

## Token não enviado

```json
{
  "error": "Token não informado."
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

---

# 16. Endpoints mais importantes para o Frontend MVP

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

# 17. Observações para o frontend

## Token

Após login, salvar o token e enviar em rotas protegidas:

```txt
Authorization: Bearer TOKEN_AQUI
```

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

A Copa 2026 usa mais grupos do que o formato antigo. O frontend deve estar preparado para grupos de `A` até `L`.

---

# 18. Checklist de integração do frontend

```txt
[ ] Criar tela de cadastro usando POST /users
[ ] Criar tela de login usando POST /users/login
[ ] Salvar token após login
[ ] Consultar GET /users/me ao carregar a aplicação
[ ] Criar tela para entrar em bolão por código
[ ] Listar bolões com GET /pools/me
[ ] Guardar pool_id selecionado
[ ] Carregar progresso dos grupos
[ ] Abrir tela de jogos por grupo
[ ] Criar palpites
[ ] Editar palpites
[ ] Exibir ranking por bolão
[ ] Exibir regras de pontuação
[ ] Mostrar menu Gerenciar apenas para admin
```