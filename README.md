# Rico · MEREO do time

Painel do líder para acompanhar o MEREO de cada membro do time — visão **mensal** e **semestral** —, com o mesmo cálculo do [Rico Pipeline](https://gustavoamorim27-svg.github.io/rico-pipeline/) e a mesma identidade visual (Hub do Assessor / Pipeline, tema Rico por padrão).

## O que dá para fazer

- **Equipe:** adicionar e remover membros (remoção com desfazer e lista de removidos para restaurar; os lançamentos ficam preservados). Nome e código A são os únicos campos digitados.
- **Metas por membro:** captação, cesta de investimento, crossell, índice comercial e NPS, com presets e sliders. “Metas para todos” aplica o mesmo padrão ao time inteiro.
- **Metas do semestre:** na visão semestral do membro, distribua a meta total do semestre igualmente ou ajuste mês a mês (captação, cesta e crossell).
- **Estimar o mês:** sliders com presets em % da meta (Zero, 50%, 80%, 100%, 120%, 150%); o MEREO recalcula ao vivo. Tocar no número permite digitar o valor exato. Cada mês é marcado como **Estimativa** ou **Realizado**. Atalhos: copiar mês anterior e repetir a estimativa até o fim do semestre (sem tocar nos realizados).
- **Painel do time:** ranking mensal com nota por indicador e captação × meta; no semestre, mapa de calor membro × mês com a nota do semestre.
- **Semestre em dois modos:** *Projeção* (meses vazios recebem a média dos lançados) e *Até agora* (só os meses lançados contra as metas desses meses).

## Cálculo (idêntico ao `monthData` do Pipeline)

| Indicador | Peso | Curva de atingimento → notas 1 a 5 |
|---|---|---|
| Captação | 40% | 20 · 60 · 100 · 140 · 180% |
| Cesta investimento | 20% | 60 · 80 · 100 · 120 · 140% |
| Crossell | 10% | 60 · 80 · 100 · 120 · 140% |
| Índice comercial | 10% | 80 · 90 · 100 · 110 · 120% |
| NPS | 20% | 60 · 80 · 100 · 120 · 140% |

- 100% da meta = nota 3; linear entre os pontos; nota final = média ponderada (máx. 5,00).
- Previdência e STVM dentro da captação pesam 1,25×; a previdência ponderada também soma na cesta (cesta = alocação + previdência 1,25×).
- Crossell: cartão = 1 ponto; consórcio = 1 ponto/R$ 10 mil; seguro = 1 ponto/R$ 1 mil. Meta 25 pts com mínimo de 10 pts em seguros (card 2S2026): sem o mínimo, os demais produtos contam até 15 pts.
- IC e NPS sem lançamento usam a referência da meta (nota 3), como no Pipeline.
- Metas padrão: captação R$ 800 mil/mês, cesta R$ 2,2 mi, crossell 25 pts, IC 83%. NPS segue o card 2S2026 mês a mês (jul 35 · ago 37,5 · set 40 · out 42,5 · nov 45 · dez 47,5); fora dele, 41,3.
- Semestre: captação, cesta e crossell somam os 6 meses contra a soma das metas mensais; IC e NPS pela média dos meses lançados.

`core.test.mjs` compara as notas com valores gerados pelo `monthData()` do Pipeline para os mesmos lançamentos.

## Dados

- Tudo fica salvo no aparelho (localStorage) e funciona offline.
- **Sincronizar entre aparelhos (opcional):** em *Minha base → Criar chave*. A base vai criptografada (AES-GCM, chave derivada por HKDF) para a coleção `ricoPipeline` do projeto Firebase `rico-hub`, em documentos `mereo-v1-*`, separados dos documentos do Pipeline. No outro aparelho, *Já tenho uma chave*. Quem tem a chave vê e edita a base.
- **Compartilhar time:** em *Equipe* ou *Minha base*, gera um link (`…/rico-mereo/#time=MEREO-…`). Quem abre entra direto na base do time — sem colar chave — e vê os mesmos membros, metas e lançamentos. Quem tem o link também edita.
- Sincroniza a cada 5 s com a tela em uso (20 s se ficar parada), ao voltar para a aba e logo após cada alteração; conflitos são mesclados por registro (membro/mês), usando a precondição `updateTime` do Firestore.
- *Exportar / Importar* gera e mescla um JSON completo.

## Publicação

Site estático, arquivo único (`index.html`), sem build necessário para publicar. GitHub Pages na raiz, mantendo `.nojekyll`.

Para editar: o código-fonte está em `src/` (`core.js`, `app.js`, `base.css`, `app.css`, `logo.js`); `python3 build.py` gera o `index.html`.

```sh
node --test core.test.mjs
python3 build.py
python3 -m http.server 8766
```
