## MCP DO BANCO DE DADOS
- MCP BANCO-JUAZ

## ESTRUTURA TABELAS DA BASE JUAZEIRO

### TABELA "COMPPROD" - Estoque
CODPROD = Cod.Produto
CODEMPRESA = Cod.Filial
ESTOQUE = Quantidade em estoque
QUANTBLOQUEADA = Quantidade bloqueada Para Vendas 
PRECOCUSTO = Preço de custo
PRECOMEDIO = Preço médio
DATACUSTOCALC = Data do cálculo do preço médio
ESTMINIMO = Estoque mínimo banco juazeiro

### TABELA "NFENTRC" - Nota de entrada Cabeçalho
CODEMPRESA = Cod.Filial
CODFORNEC = Cod.Fornecedor
NUMERONF = Número da nota
DT_EMISSAO = Data de emissão
DT_ENTRADA = Data de entrada
CODOPER = Cod.Operação
TOTALNF = Total da nota

### TABELA "NFENTRI" - Nota de entrada Itens
CODEMPRESA = Cod.Filial
NUMERONF = Número da nota
CODFORNEC = Cod.Fornecedor
CODPROD = Cod. do produto
QUANTIDADE = Quantidade Entrada
PRECONF = Preço de custo

### TABELA "MVGERAL" - Movimentação de produtos
CODEMPRESA = Cod.Filial
TIPOAGENTE = Tipo do agente
CODIGOAGENTE = Cod. do agente
DOCUMENTO = Documento
CODPROD = Cod. do produto
DT_MOVIMENTO = Data do movimento
TIPOMOV = Tipo do movimento
ESTOQANT = Quantidade em estoque na data do movimento estoque antigo
QUANTIDADE = Quantidade movimentada
PRECOCUSTO = Preço de custo
PRECOMEDIO = Preço médio
PRECOENTRADA = Preço de entrada
ID_ITEM = ID do item
INTEGOFFLINE = Indicador de offline

### TABELA "PEDIDOC" - Pedidos
CODEMPRESA = Cod.Filial
TIPOPEDIDO = Tipo do pedido
CODPEDIDO = Cod. do pedido
CODCLIENTE = Cod. do cliente
DATAPEDIDO = Data do pedido
FATURADO = Indicador de faturado (S = sim, N = nao, X = cancelado)
CODVENDEDOR = Cod. do vendedor
COMISSAO = Comissão
DESCONTOPERC = Desconto em porcentagem
DATAFATURA = Data da fatura
DESCONTOVLR = Desconto em valor
CODPEDIDOTROCA = Cod. do pedido de troca
TOTALPEDIDO = Total do pedido
OBSERVACAO = Observação

### NOMES DAS FILIAIS
00 = Petrolina
01 = Juazeiro
02 = Salgueiro
03 = Garantia
04 = CD Centro de Distribuição
05 = Bonfim
06 = Picos

### TABELA "PRODUTO"
CODPROD = Cod. do produto
ATIVO = Indicador de ativo (S = sim, N = nao)
REFERENCIA = codigo Barras
REFFABRICANTE = codigo de referencia do fabricante
DESCRICAO = Descrição do produto
DESCRICAO2 = Descrição 2 do produto
DESCRICAO3 = Referencias Similares
CODGRUPO = Cod. do grupo
CODSUBGRUPO = Cod. do subgrupo
ESTMINIMO = Estoque mínimo banco juazeiro
DIASESTMINIMO = Dias de estoque mínimo banco juazeiro
ESTMAXIMO = Estoque máximo banco juazeiro
DIASESTMAXIMO = Dias de estoque máximo banco juazeiro
COMISSAO = Comissão
CODFABRIC = Cod. do fabricante
UNIDADEENT = Unidade de entrada
UNIDADESAIDA = Unidade de saída
PRODBLOQUEADO = Indicador de bloqueado (S = sim, N = nao)
PRINCIPALFORNEC = Cod. do fornecedor principal 
DT_CADASTRO = Data de cadastro
DATA_ULT_ALTERACAO = Data de última alteração

## URL EXTERNA PARA ACESSAR O BANCO DE DADOS:
postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable