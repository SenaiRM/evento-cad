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
    const token    = gerarTokenUnico(planilha);
    const agora    = new Date();

    planilha.appendRow([
      planilha.getLastRow(),           // ID sequencial
      nome.trim(),
      email.trim().toLowerCase(),
      telefone.trim(),
      cpf.trim(),
      token,
      Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
      dados.ip || '',
    ]);

    enviarEmailConfirmacao(email, nome, token, cpf);

    lock.releaseLock();
    return resposta({ ok: true, token, nome });

  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    Logger.log('ERRO: ' + err.message);
    return resposta({ ok: false, mensagem: 'Erro interno. Tente novamente.' });
  }
}

// Permite testar se o script está ativo via GET
function doGet() {
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

function enviarEmailConfirmacao(para, nome, token, cpf) {
  const cpfMascarado = mascararCpf(cpf);

  const html = '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border-radius:10px;overflow:hidden;border:1px solid #ddd;">'
    + '<div style="background:#0B3C7A;padding:24px 28px;text-align:center;">'
    +   '<div style="color:#FFD100;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">SENAI · ADS Anápolis</div>'
    +   '<h1 style="color:#FFD100;margin:0;font-size:20px;line-height:1.3;">' + NOME_EVENTO + '</h1>'
    +   '<p style="color:#cce0ff;margin:6px 0 0;font-size:12px;">' + DATA_EVENTO + '</p>'
    + '</div>'
    + '<div style="background:#fff;padding:24px 28px;">'
    +   '<p style="font-size:15px;color:#222;">Olá, <strong>' + nome + '</strong>!</p>'
    +   '<p style="font-size:14px;color:#555;line-height:1.6;">Seu cadastro foi concluído. Guarde este e-mail — ele contém o seu número para o sorteio.</p>'
    +   '<div style="background:#0B3C7A;border-radius:10px;padding:22px;text-align:center;margin:20px 0;">'
    +     '<div style="color:#FFD100;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">TOKEN DO SORTEIO</div>'
    +     '<div style="color:#fff;font-size:44px;font-weight:700;letter-spacing:8px;font-family:\'Courier New\',monospace;">' + token + '</div>'
    +   '</div>'
    +   '<table style="width:100%;font-size:13px;color:#444;border-collapse:collapse;">'
    +     '<tr><td style="padding:4px 0;width:60px;color:#888;">Nome:</td><td style="padding:4px 0;font-weight:600;">' + nome + '</td></tr>'
    +     '<tr><td style="padding:4px 0;color:#888;">CPF:</td><td style="padding:4px 0;">' + cpfMascarado + '</td></tr>'
    +   '</table>'
    +   '<div style="background:#fffbea;border-left:4px solid #FFD100;padding:12px 16px;border-radius:0 6px 6px 0;margin-top:20px;font-size:13px;color:#5a4800;line-height:1.6;">'
    +     '📋 <strong>Como participar do sorteio:</strong><br>Deposite seu cupom impresso em uma das urnas localizadas no interior do evento e concorra a brindes!'
    +   '</div>'
    + '</div>'
    + '<div style="background:#f5f5f5;padding:14px;text-align:center;font-size:11px;color:#999;">'
    +   'Desenvolvido pelo curso de <strong style="color:#0B3C7A;">Análise e Desenvolvimento de Sistemas — ADS · SENAI Anápolis</strong>'
    + '</div>'
    + '</div>';

  MailApp.sendEmail({ to: para, subject: ASSUNTO_EMAIL, htmlBody: html });
}

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
