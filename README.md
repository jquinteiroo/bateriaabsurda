# Bateria Absurda — Central de ensaio

Organizador editável para planejar a apresentação da bateria, com a identidade visual da bateria: verde vibrante, preto, tipografia pesada e faixas com textura de papel rasgado. As áreas de edição mantêm fundo branco.

## Recursos

- Sequência inicial transcrita do rascunho, com meta de 7 minutos.
- Adicionar, editar, excluir e reordenar trechos por arraste ou pelas setas.
- Duração e observações por trecho, com cálculo do tempo total.
- Biblioteca de breques com siglas, nomes e legendas.
- Formação da bateria com caixinhas móveis e editáveis.
- Caderno de ensaio, impressão e exportação/importação do planejamento em JSON.
- Layout adaptado para celular e computador.

Os nomes e as posições são uma transcrição aproximada do rascunho e podem ser ajustados.

## Como rodar

Este projeto usa HTML, CSS e JavaScript puro. Não exige instalação de dependências nem etapa de compilação.

1. Clone o repositório e entre na pasta:

```sh
git clone https://github.com/jquinteiroo/bateriaabsurda.git
cd bateriaabsurda
```

2. Com Python 3 instalado, inicie um servidor local:

```sh
python -m http.server 4173
```

3. Abra http://localhost:4173 no navegador.

Também é possível servir a pasta com qualquer servidor estático.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Estrutura e textos da interface |
| `style.css` | Layout e aparência responsiva de base |
| `brand.css` | Identidade visual da Bateria Absurda |
| `paper.svg` | Textura vetorial das faixas de papel |
| `app.js` | Sequência, formação, editores e armazenamento |

Para mudar as cores, edite a paleta em `brand.css`. Para mudar o planejamento padrão de novos navegadores, edite o objeto `initial` em `app.js`.

## Salvamento e cópias

As alterações feitas na interface são salvas no armazenamento local do navegador. Elas não são enviadas ao GitHub nem sincronizadas entre aparelhos.

Use **Exportar roteiro** para guardar uma cópia JSON e **Importar** para carregá-la em outro navegador. A importação substitui o planejamento atual após confirmação. Limpar os dados do navegador apaga o planejamento local.

As fontes do Google Fonts usam internet; sem conexão, o site utiliza as fontes alternativas do sistema.

## Publicação

Os arquivos HTML, CSS, JavaScript e SVG podem ser hospedados diretamente em qualquer serviço para sites estáticos. Não há servidor de aplicação, banco de dados ou variáveis secretas.

Versão hospedada atual: https://bateria-roteiro-joao.jonesfogo.chatgpt.site

Este repositório é uma exportação do código atual. Alterações nele não atualizam automaticamente o site hospedado.
