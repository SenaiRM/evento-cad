# Feirão de Imóveis e Oportunidades Anápolis 2026
## Cadastro + Token de Sorteio

Desenvolvido pelo curso de **Análise e Desenvolvimento de Sistemas — ADS · SENAI Anápolis**

---

## Como configurar (passo a passo)

### 1. Criar a planilha no Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha
2. Dê um nome, por exemplo: **Feirão Imóveis 2026 — Participantes**
3. Deixe a aba aberta, você vai precisar dela no próximo passo

---

### 2. Configurar o Google Apps Script

1. Na planilha, clique em **Extensões > Apps Script**
2. Apague todo o código que aparece (a função `myFunction`)
3. Cole o conteúdo do arquivo `gas/codigo.gs` (está neste projeto)
4. Salve com **Ctrl+S** (ou ⌘+S no Mac)

#### Implantar como aplicativo da web

1. Clique em **Implantar > Nova implantação**
2. Clique no ícone de engrenagem ⚙️ e escolha **Aplicativo da web**
3. Preencha:
   - **Descrição:** Feirão 2026
   - **Executar como:** Eu mesmo
   - **Quem tem acesso:** Qualquer pessoa
4. Clique em **Implantar**
5. Autorize as permissões quando solicitado (clique em "Avançado" > "Acessar ... (não seguro)" > permitir)
6. **Copie a URL** que aparece (começa com `https://script.google.com/macros/s/...`)

---

### 3. Colar a URL no formulário

1. Abra o arquivo `index.html`
2. Encontre a linha:
   ```js
   const GAS_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT';
   ```
3. Substitua `COLE_AQUI_A_URL_DO_APPS_SCRIPT` pela URL copiada no passo anterior
4. Salve o arquivo

---

### 4. Publicar no GitHub Pages

1. Faça push de todos os arquivos para o repositório no GitHub
2. No repositório, vá em **Settings > Pages**
3. Em **Source**, selecione a branch `main` e a pasta `/ (root)`
4. Clique em **Save**
5. Aguarde alguns minutos — o link do seu site vai aparecer nessa mesma página

---

### 5. Configurar e-mail (opcional)

O envio de e-mail de confirmação usa o Gmail da conta Google que criou o Apps Script.
Não precisa de configuração extra — funciona automaticamente após a implantação.

> **Cota:** contas Gmail pessoais enviam até **100 e-mails/dia**.
> Contas Google Workspace enviam até **1.500/dia**.

---

## Estrutura do projeto

```
evento-cad/
├── index.html          ← Formulário + comprovante (abrir no navegador)
├── gas/
│   └── codigo.gs       ← Colar no Google Apps Script
└── README.md           ← Este arquivo
```

---

## Dados coletados

| Campo      | Descrição                         |
|------------|-----------------------------------|
| Nome       | Nome completo do participante     |
| E-mail     | Endereço de e-mail                |
| Telefone   | WhatsApp com DDD                  |
| CPF        | Formatado (XXX.XXX.XXX-XX)        |
| Token      | 8 dígitos, único por participante |
| Data/Hora  | Horário de Brasília               |

---

## Impressão do cupom

Após o cadastro, clique em **Imprimir cupom**.

- **Impressora normal (A4):** o cupom fica centralizado na página
- **Impressora térmica (80mm):** o layout já está otimizado para esse tamanho
- **Sem impressora:** o participante pode mostrar a tela ou receber o token por e-mail

---

## Dúvidas

Abra uma issue neste repositório ou entre em contato com a equipe do curso ADS — SENAI Anápolis.
