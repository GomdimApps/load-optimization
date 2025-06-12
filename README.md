# API de Otimização de Carga

## Executando com Docker Compose

### Iniciando a aplicação

Para iniciar a aplicação, execute:

```bash
docker compose up -d
```

### Parando a aplicação

Para parar a aplicação, execute:

```bash
docker compose down
```

### Acessando o Front-end

Após iniciar a aplicação, acesse o front-end através do navegador:

```
http://localhost:9090
```

## Endpoints Disponíveis

### 1. Criar um Novo Item

```bash
curl -X POST http://localhost:8080/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "type": "caixa",
    "width": 2.0,
    "height": 2.0,
    "length": 2.0,
    "weight": 10.0
  }'
```

### 2. Otimizar Posicionamento

```bash
curl -X POST http://localhost:8080/api/optimize
```

### 3. Deletar um Item

```bash
curl -X DELETE http://localhost:8080/api/items/1
```

## Estrutura do JSON para Criar Item

```json
{
  "type": "string",    // Tipo do item
  "width": float,      // Largura em metros
  "height": float,     // Altura em metros
  "length": float,     // Comprimento em metros
  "weight": float      // Peso em kg
}
```

## Resposta da Otimização

```json
{
  "ferry_info": {
    "width": 20.0,
    "height": 5.0,
    "length": 30.0,
    "max_weight": 200.0,
    "usable_space_percentage": 0.9
  },
  "placed_items": [],
  "unplaced_items": [],
  "total_weight": 0,
  "total_volume_occupied": 0,
  "ferry_total_volume": 2700,
  "utilization_percentage": 0
}
```
