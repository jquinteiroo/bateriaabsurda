# Bateria Absurda — Central de ensaio

Organizador editável para planejar a apresentação da bateria, com a identidade visual da bateria: verde vibrante, preto, tipografia pesada e faixas com textura de papel rasgado. As áreas de edição mantêm fundo branco.

## Recursos

- Sequência inicial transcrita do rascunho.
- Peça sem controles de edição. Trechos, ordem, duração, meta e caderno são definidos no código.
- Barra com a sequência completa da peça, com siglas e numeração dos trechos. Em telas menores, a barra permite rolagem horizontal.
- Duração e observações por trecho.
- Biblioteca de breques com siglas, nomes e legendas.
- Duas formações selecionáveis, de palco e em círculo, com posições independentes e os mesmos integrantes. O mestre fica no centro do círculo.
- Material de estudo dos participantes, com filtros por instrumento e videoaulas ou playlists do YouTube.
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
| `formation.js` | Formações de palco e círculo, seletor e migração das posições |
| `tutorials.js` | Instrumentos, catálogo de aulas, filtros e editor de tutoriais |
| `tutorials.css` | Layout responsivo da seção de tutoriais |

Para mudar as cores, edite a paleta em `brand.css`. Para mudar o planejamento padrão de novos navegadores, edite o objeto `initial` em `app.js`.

## Salvamento e cópias

As alterações feitas na interface são salvas no armazenamento local do navegador. Elas não são enviadas ao GitHub nem sincronizadas entre aparelhos.

Use **Exportar peça** para guardar uma cópia JSON. **Importar** atualiza formação, biblioteca e tutoriais após confirmação, preservando a sequência, a meta e o caderno da peça bloqueada. Os breques necessários para a sequência são mantidos quando faltarem na biblioteca importada. Limpar os dados do navegador apaga o planejamento local.

As fontes do Google Fonts usam internet; sem conexão, o site utiliza as fontes alternativas do sistema.

## Formações

Na aba **Formação**, a opção inicial é **Em círculo**, seguida de **Palco**. Alterne pelo seletor, pelas setas verdes nas bordas ou deslizando horizontalmente no espaço livre do mapa. Arrastar um integrante continua ajustando apenas sua posição. Mover alguém em uma formação não altera suas posições na outra. Nomes e instrumentos são compartilhados entre as duas. As posições e a formação selecionada são salvas no navegador e acompanham o JSON exportado. Planejamentos antigos recebem o círculo sem alterar as posições de palco já salvas. O círculo se ajusta à largura da tela. A troca de formação também funciona pelas teclas de seta quando o mapa está em foco.

## Tutoriais dos instrumentos

A aba **Tutoriais** reúne o material de ensaio dos participantes, dividido em sete instrumentos: surdo de primeira, surdo de terceira, caixa, ripa, tamborim, agogô e chocalho. Mestre/apito continua na formação, mas não faz parte dos tutoriais.

Use os filtros para escolher um instrumento. Os botões para adicionar trechos, integrantes, breques e tutoriais foram removidos; novos itens são definidos no código. Formação, breques e tutoriais existentes continuam editáveis; a peça permanece em somente leitura. As aulas abrem em outra aba. O cadastro preserva a playlist, sua posição e o ponto de início quando presentes no link.

O catálogo inclui uma playlist geral de surdos, disponível nos dois tipos de surdo, duas aulas de tamborim e os materiais escolhidos pelos participantes para [caixa](https://www.youtube.com/watch?v=kkMP9E-Z0tI&list=PL3y2Ed7WCb4usLCuPy2HikNZMjWjltEL1), [ripa](https://www.youtube.com/watch?v=de9I8qu7Zns), [chocalho, a partir de 2:26](https://www.youtube.com/watch?v=UPERc1jqSVI&t=146s) e [agogô](https://www.youtube.com/watch?v=QnCsy26KJtc&list=PLVPvwO6TJEuD7sd4Q7DEoaGQwLPD_dpY5&index=14). A seleção deve respeitar a função e os arranjos usados pela Absurda, especialmente no estudo do surdo de terceira.

Os links iniciais foram identificados nas referências de [surdo do Samba Savannah](https://www.sambasavannah.org/resources/surdo.html) e [tamborim do Sambalistic](https://www.sambalistic.com/f54sjhg893nsjdq567hh/). A reprodução e a disponibilidade atual de cada vídeo precisam ser conferidas no YouTube.

Os tutoriais cadastrados são salvos neste navegador e acompanham a exportação JSON do planejamento. Planejamentos antigos continuam compatíveis: a revisão 2 acrescenta os quatro materiais escolhidos sem duplicar aulas já cadastradas e retira a categoria de apito, preservando peça, formação e os demais cadastros locais. Para alterar o catálogo inicial, edite `defaultTutorials` em `tutorials.js`.

Para verificar a inicialização, os filtros, o cadastro, a validação dos links e a compatibilidade dos dados, execute `node tests/tutorials.test.cjs` com Node.js instalado. Os testes usam um DOM mínimo e não substituem a conferência visual no navegador.

## Publicação

Os arquivos HTML, CSS, JavaScript e SVG podem ser hospedados diretamente em qualquer serviço para sites estáticos. Não há servidor de aplicação, banco de dados ou variáveis secretas.

Versão hospedada atual: https://bateria-roteiro-joao.jonesfogo.chatgpt.site

Este repositório é uma exportação do código atual. Alterações nele não atualizam automaticamente o site hospedado.
