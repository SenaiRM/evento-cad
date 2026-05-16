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

const NOME_ABA      = 'Participantes';
const NOME_EVENTO   = 'Feirão de Imóveis e Oportunidades Anápolis 2026';
const CHAVE_SORTEIO = 'senai2026';

// --------------- Ponto de entrada (POST) ---------------

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const dados = JSON.parse(e.postData.contents);

    // Ação: enviar e-mail com token
    if (dados.action === 'email') {
      const { nome, email, cpf, token } = dados;
      if (!nome || !email || !token) {
        lock.releaseLock();
        return resposta({ ok: false, mensagem: 'Dados insuficientes para envio.' });
      }
      try {
        enviarEmail(nome, email, cpf, token);
      } catch (errEmail) {
        lock.releaseLock();
        Logger.log('ERRO EMAIL: ' + errEmail.message);
        const semPermissao = errEmail.message && (
          errEmail.message.indexOf('Gmail') !== -1 ||
          errEmail.message.indexOf('authorization') !== -1 ||
          errEmail.message.indexOf('permission') !== -1 ||
          errEmail.message.indexOf('scope') !== -1
        );
        return resposta({
          ok: false,
          mensagem: semPermissao
            ? 'O script não tem permissão para enviar e-mails. Reautorize o Apps Script.'
            : 'Falha ao enviar e-mail: ' + errEmail.message,
        });
      }
      lock.releaseLock();
      return resposta({ ok: true });
    }

    // Ação: listar participantes (chamada da página de sorteio)
    if (dados.action === 'listar') {
      if (dados.key !== CHAVE_SORTEIO) {
        lock.releaseLock();
        return resposta({ ok: false, mensagem: 'Acesso negado.' });
      }
      const aba  = obterOuCriarAba();
      const rows = aba.getDataRange().getValues();
      const participantes = rows.slice(1).map(function(r) {
        return { nome: r[1], token: String(r[5]), data: String(r[6]) };
      }).filter(function(p) { return p.token; });
      lock.releaseLock();
      return resposta({ ok: true, participantes: participantes });
    }

    // Ação: salvar respostas de qualificação
    if (dados.action === 'qualificacao') {
      const { token, imovel, fazInvest, tipoInvest, querInfo, querAprender, planejaCom } = dados;
      if (!token) {
        lock.releaseLock();
        return resposta({ ok: false, mensagem: 'Token ausente.' });
      }
      const aba  = obterOuCriarAba();
      const rows = aba.getDataRange().getValues();
      var linhaIdx = -1;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][5]) === String(token)) { linhaIdx = i + 1; break; }
      }
      if (linhaIdx === -1) {
        lock.releaseLock();
        return resposta({ ok: false, mensagem: 'Token não encontrado.' });
      }
      aba.getRange(linhaIdx, 9, 1, 6).setValues([[
        imovel       || '',
        fazInvest    || '',
        tipoInvest   || '',
        querInfo     || '',
        querAprender || '',
        planejaCom   || '',
      ]]);
      lock.releaseLock();
      return resposta({ ok: true });
    }

    // Ação padrão: cadastro
    const { nome, email, telefone, cpf } = dados;

    if (!nome || !email || !telefone || !cpf) {
      lock.releaseLock();
      return resposta({ ok: false, mensagem: 'Todos os campos são obrigatórios.' });
    }

    const planilha = obterOuCriarAba();
    const cpfLimpo = cpf.replace(/\D/g, '');

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
      '', '', '', '', '', '',   // colunas de qualificação (I–N)
    ]);

    lock.releaseLock();
    return resposta({ ok: true, token, nome });

  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    Logger.log('ERRO: ' + err.message);
    return resposta({ ok: false, mensagem: 'Erro interno. Tente novamente.' });
  }
}

function doGet(e) {
  return resposta({ status: 'online', evento: NOME_EVENTO });
}

// --------------- Planilha ---------------

function obterOuCriarAba() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let aba   = ss.getSheetByName(NOME_ABA);

  if (!aba) {
    aba = ss.insertSheet(NOME_ABA);
    aba.appendRow([
      'ID', 'Nome', 'E-mail', 'Telefone', 'CPF', 'Token', 'Data/Hora', 'IP',
      'Imóvel Próprio', 'Faz Investimento', 'Tipo Investimento',
      'Quer Info Empreendimentos', 'Quer Aprender Invest.', 'Planeja Comprar',
    ]);
    aba.setFrozenRows(1);

    const cabecalho = aba.getRange(1, 1, 1, 14);
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
      return String(dados[i][5]);
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

function enviarEmail(nome, email, cpf, token) {
  var cpfMask = String(cpf).replace(/\D/g, '');
  if (cpfMask.length === 11) {
    cpfMask = '***.' + cpfMask.substring(3,6) + '.' + cpfMask.substring(6,9) + '-**';
  }

  var corpo = '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">'
    + '<div style="background:#0B3C7A;padding:24px;text-align:center;">'
    + '<h2 style="color:#FFD100;margin:0 0 4px;">Feirão de Imóveis e Oportunidades</h2>'
    + '<p style="color:#fff;margin:0;font-size:13px;">Anápolis 2026 · 21 a 23 de maio · Praça Dom Emanuel</p>'
    + '</div>'
    + '<div style="padding:24px;background:#fff;">'
    + '<p style="font-size:15px;">Olá, <strong>' + nome + '</strong>!</p>'
    + '<p style="color:#555;font-size:14px;">Seu token de sorteio está abaixo. Guarde-o!</p>'
    + '<div style="background:#0B3C7A;border-radius:10px;padding:24px;text-align:center;margin:20px 0;">'
    + '<div style="color:#FFD100;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Seu Token de Sorteio</div>'
    + '<div style="color:#fff;font-size:42px;font-weight:700;letter-spacing:6px;font-family:\'Courier New\',monospace;">' + token + '</div>'
    + '</div>'
    + '<p style="font-size:13px;color:#666;">CPF: <strong>' + cpfMask + '</strong></p>'
    + '<div style="background:#fffbea;border-left:4px solid #FFD100;padding:12px 16px;font-size:13px;color:#5a4a00;">'
    + '<strong>Como participar:</strong> Deposite seu cupom impresso em uma das urnas no evento e concorra a brindes.'
    + '</div>'
    + '</div>'
    + '<div style="background:#f8f9fa;padding:12px;text-align:center;font-size:11px;color:#999;">'
    + 'Desenvolvido pelo curso de <strong style="color:#0B3C7A;">ADS · SENAI Anápolis</strong>'
    + '</div>'
    + '</div>';

  GmailApp.sendEmail(email, 'Seu token — Feirão de Imóveis Anápolis 2026', '', {
    htmlBody: corpo,
    name:     'Feirão de Imóveis 2026',
  });
}

// --------------- Helpers ---------------

function resposta(dados) {
  return ContentService
    .createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}
