# Planilha de cadastros e downloads · passo a passo

Tempo: cerca de 5 minutos. Você precisa estar logado na sua conta Google.

## 1. Criar a planilha
1. Abra https://sheets.new (cria uma planilha em branco).
2. Dê um nome, por exemplo **A Virada – Cadastros**.

## 2. Colar o script
1. No menu da planilha: **Extensões → Apps Script**.
2. Apague todo o conteúdo do arquivo `Código.gs` que abre.
3. Abra o arquivo `Code.gs` desta pasta, copie tudo e cole no editor.
4. Clique no ícone de disquete (Salvar).

## 3. Criar as abas (uma vez)
1. Na barra acima do código, no menu suspenso de funções, escolha **setup**.
2. Clique em **Executar**.
3. O Google pede autorização: **Revisar permissões → escolha sua conta → Avançado → Acessar (não seguro) → Permitir**.
   O aviso aparece porque o script é seu e não passou por verificação do Google; é normal.
4. Volte à planilha: devem existir as abas **Resumo**, **Cadastros** e **Downloads**.

## 4. Publicar o endereço que recebe os dados
1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. No ícone de engrenagem ao lado de "Selecionar tipo", escolha **App da Web**.
3. Preencha:
   - Descrição: `webhook a virada`
   - Executar como: **Eu** (seu e-mail)
   - Quem pode acessar: **Qualquer pessoa**  ← importante, é o site que chama
4. Clique em **Implantar**. Se pedir autorização de novo, repita o passo 3.3.
5. Copie a **URL do app da Web**. Ela termina em `/exec`.
6. Cole essa URL na conversa. Eu configuro o site e publico.

## 5. Conferir
- Abra a URL `/exec` no navegador: deve aparecer `{"ok":true,"service":"a-virada-webhook",...}`.
- Depois que o site estiver configurado, faça um cadastro de teste e um download: as linhas aparecem
  nas abas em poucos segundos e o Resumo atualiza sozinho.

## Se um dia editar o script
Alterações no código só entram em vigor com **Implantar → Gerenciar implantações → (lápis) → Versão: Nova versão → Implantar**.
A URL continua a mesma.

## O que fica registrado
- **Cadastros**: data/hora (horário de Brasília), nome, e-mail, WhatsApp (formato +55...), se aceitou WhatsApp,
  consentimento e o texto exato aceito, origem, página, se aceitou medição, e o horário enviado pelo site.
- **Downloads**: data/hora, nome e e-mail (quando a pessoa se cadastrou no mesmo navegador), arquivo, origem, página.
- **Visitas**: uma linha por abertura de página, com página, origem (site de onde veio, UTM), dispositivo, idioma e se é a
  primeira visita naquele navegador. Sem nome, e-mail, IP ou identificador de pessoa.
- **Resumo**: visitas, cadastros e downloads (total, hoje, últimos 7 dias), taxas de conversão e tabelas de visitas por origem e por página.

Os dados ficam só na sua conta Google. Para pedidos de exclusão (LGPD), apague a linha correspondente.
