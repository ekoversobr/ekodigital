/**
 * JS Digital — recebe os leads do formulário e organiza o funil.
 * Como usar:
 * 1. Crie uma planilha nova no Google Sheets: "JS Digital | Leads e Vendas".
 * 2. Extensões > Apps Script > cole este código > salve.
 * 3. Rode a função configurar() uma vez (autorize).
 * 4. Implantar > Nova implantação > Tipo: App da Web > Executar como: Eu > Acesso: Qualquer pessoa.
 * 5. Copie a URL que termina em /exec e cole em assets/site.js (ENDPOINT_PLANILHA).
 *
 * Funil: na aba "Leads", preencha a data de cada etapa quando acontecer.
 * A aba "Conversões offline" é montada por gerarExportacao() no formato de importação do Google Ads.
 */

var ABA_LEADS = 'Leads';
var ABA_EXPORT = 'Conversões offline';
var FUSO = 'America/Fortaleza';

var COLUNAS = [
  'Data e hora', 'Nome', 'Clínica', 'Cidade', 'WhatsApp', 'Já investe?', 'Melhor horário',
  'GCLID', 'GBRAID', 'WBRAID', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'Página de origem', 'Referrer',
  'Status', 'Reunião agendada (data)', 'Proposta enviada (data)', 'Contrato fechado (data)',
  'Valor do contrato (R$)', 'Observações'
];
var CAMPOS = ['', 'nome', 'clinica', 'cidade', 'whatsapp', 'ja_investe', 'melhor_horario',
  'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'pagina_origem', 'referrer'];

// Nomes das conversões: crie as 3 no Google Ads com exatamente estes nomes (origem: Importar > cliques)
var CONVERSOES = {
  19: 'JS Digital - Reuniao agendada',
  20: 'JS Digital - Proposta enviada',
  21: 'JS Digital - Contrato fechado'
};

function configurar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(FUSO);
  var aba = ss.getSheetByName(ABA_LEADS) || ss.insertSheet(ABA_LEADS);
  aba.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight('bold')
     .setBackground('#0F5466').setFontColor('#ffffff');
  aba.setFrozenRows(1);
  var regra = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Novo', 'Reunião agendada', 'Proposta enviada', 'Contrato fechado', 'Perdido'], true)
    .build();
  aba.getRange(2, 18, 1000, 1).setDataValidation(regra);
  aba.getRange(2, 19, 1000, 3).setNumberFormat('dd/mm/yyyy hh:mm');
  aba.getRange(2, 22, 1000, 1).setNumberFormat('"R$" #,##0.00');
  aba.getRange(2, 1, 1000, 1).setNumberFormat('dd/mm/yyyy hh:mm:ss');
  var exp = ss.getSheetByName(ABA_EXPORT) || ss.insertSheet(ABA_EXPORT);
  exp.clear();
  exp.getRange(1, 1).setValue('Parameters:TimeZone=-0300');
  exp.getRange(2, 1, 1, 5).setValues([['Google Click ID', 'Conversion Name', 'Conversion Time', 'Conversion Value', 'Conversion Currency']]).setFontWeight('bold');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var p = (e && e.parameter) || {};
    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_LEADS);
    var linha = CAMPOS.map(function (c, i) {
      if (i === 0) return new Date();
      var v = String(p[c] || '').slice(0, 500);
      return /^[=+\-@]/.test(v) ? "'" + v : v; // evita fórmula injetada
    });
    linha.push('Novo');
    aba.appendRow(linha);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/** Monta a aba de exportação com cada etapa que tem data e GCLID. Rode antes de importar no Google Ads. */
function gerarExportacao() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dados = ss.getSheetByName(ABA_LEADS).getDataRange().getValues().slice(1);
  var exp = ss.getSheetByName(ABA_EXPORT);
  if (exp.getLastRow() > 2) exp.getRange(3, 1, exp.getLastRow() - 2, 5).clearContent();
  var saida = [];
  dados.forEach(function (r) {
    var gclid = r[7];
    if (!gclid) return;
    Object.keys(CONVERSOES).forEach(function (col) {
      var data = r[col - 1];
      if (!(data instanceof Date)) return;
      var valor = (Number(col) === 21 && r[21]) ? Number(r[21]) : '';
      saida.push([gclid, CONVERSOES[col], Utilities.formatDate(data, FUSO, 'yyyy-MM-dd HH:mm:ss'), valor, valor ? 'BRL' : '']);
    });
  });
  if (saida.length) exp.getRange(3, 1, saida.length, 5).setValues(saida);
  SpreadsheetApp.getActive().toast(saida.length + ' conversões prontas para importar.');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('JS Digital')
    .addItem('Gerar exportação para o Google Ads', 'gerarExportacao')
    .addToUi();
}
