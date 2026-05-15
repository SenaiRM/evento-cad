// ============================================================
//  Feirão de Imóveis e Oportunidades Anápolis 2026
//  Backend — Google Apps Script
//  Curso de Análise e Desenvolvimento de Sistemas — ADS · SENAI
// ============================================================
//
//  COMO USAR:
//  1. Abra https://script.google.com e crie um novo projeto
//  2. Cole este código (substitua tudo que está lá)
//  3. Clique em "Implantar" > "Nova implantação"
//     - Tipo: Aplicativo da Web
//     - Executar como: Eu mesmo
//     - Quem tem acesso: Qualquer pessoa
//  4. Copie a URL gerada e cole em index.html (variável GAS_URL)
// ============================================================

const NOME_ABA       = 'Participantes';
const ASSUNTO_EMAIL  = 'Seu cupom — Feirão de Imóveis e Oportunidades Anápolis 2026';
const NOME_EVENTO    = 'Feirão de Imóveis e Oportunidades Anápolis 2026';
const DATA_EVENTO    = '21 a 23 de maio · Praça Dom Emanuel · 10h às 20h';

// --------------- Ponto de entrada (POST) ---------------

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const dados = JSON.parse(e.postData.contents);
    const { nome, email, telefone, cpf } = dados;

    if (!nome || !email || !telefone || !cpf) {
      lock.releaseLock();
      return resposta({ ok: false, mensagem: 'Todos os campos são obrigatórios.' });
    }

    const planilha = obterOuCriarAba();
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Bloqueia CPF duplicado — retorna o token já gerado
    const tokenExistente = buscarTokenPorCpf(planilha, cpfLimpo);
    if (tokenExistente) {
      lock.releaseLock();
      return resposta({ ok: false, duplicado: true, token: tokenExistente,
                        mensagem: 'Este CPF já está cadastrado.' });
    }

    const token = gerarTokenUnico(planilha);
    const agora = new Date();

    planilha.appendRow([
      planilha.getLastRow(),
      nome.trim(),
      email.trim().toLowerCase(),
      telefone.trim(),
      cpf.trim(),
      token,
      Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
      dados.ip || '',
    ]);

    lock.releaseLock();
    return resposta({ ok: true, token, nome });

  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    Logger.log('ERRO: ' + err.message);
    return resposta({ ok: false, mensagem: 'Erro interno. Tente novamente.' });
  }
}

// ── Chave de acesso para a página de sorteio ──────────────
const CHAVE_SORTEIO = 'senai2026'; // troque por uma senha de sua escolha

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  if (params.action === 'listar' && params.key === CHAVE_SORTEIO) {
    const aba  = obterOuCriarAba();
    const rows = aba.getDataRange().getValues();
    const participantes = rows.slice(1).map(function(r) {
      return { nome: r[1], token: String(r[5]), data: String(r[6]) };
    }).filter(function(p) { return p.token; });
    return resposta({ ok: true, participantes: participantes });
  }

  return resposta({ status: 'online', evento: NOME_EVENTO });
}

// --------------- Planilha ---------------

function obterOuCriarAba() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let aba   = ss.getSheetByName(NOME_ABA);

  if (!aba) {
    aba = ss.insertSheet(NOME_ABA);
    aba.appendRow(['ID', 'Nome', 'E-mail', 'Telefone', 'CPF', 'Token', 'Data/Hora', 'IP']);
    aba.setFrozenRows(1);

    const cabecalho = aba.getRange(1, 1, 1, 8);
    cabecalho.setBackground('#0B3C7A');
    cabecalho.setFontColor('#FFD100');
    cabecalho.setFontWeight('bold');
  }

  return aba;
}

// --------------- Token ---------------

function buscarTokenPorCpf(aba, cpfLimpo) {
  const dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][4]).replace(/\D/g, '') === cpfLimpo) {
      return String(dados[i][5]); // retorna o token existente
    }
  }
  return null;
}

function gerarTokenUnico(aba) {
  const dados  = aba.getDataRange().getValues();
  const tokens = new Set(dados.slice(1).map(function(linha) { return linha[5]; }));

  for (var i = 0; i < 30; i++) {
    var token = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    if (!tokens.has(token)) return token;
  }

  throw new Error('Não foi possível gerar token único após 30 tentativas.');
}

// --------------- E-mail ---------------

function mascararCpf(cpf) {
  var digitos = cpf.replace(/\D/g, '');
  if (digitos.length === 11) {
    return '***.' + digitos.substring(3, 6) + '.' + digitos.substring(6, 9) + '-**';
  }
  return cpf;
}

// --------------- Helpers ---------------

function resposta(dados) {
  return ContentService
    .createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}
