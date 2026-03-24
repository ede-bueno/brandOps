/* === OMD Financeiro – versão alinhada ao script do Ede === */

/************ CONFIG ************/
const FOLDER_ID = '15OkXrX79tn9KWFRIhFPsQKn2kuyzjfFi';
const ENFORCE_CUTOFF = true;
const CUTOFF_DATE = new Date(2025, 0, 1);
const INCREMENTAL_IMPORT = true;
const IMMUTABLE_HISTORY_BEFORE = new Date(2026, 0, 1);
const CMV_CHANGE_DATE = new Date(2026, 2, 2); // 2026-03-02

const APPLY_SANITY_FILTERS = true;
const SANITY = {
  MAX_CTR: 1.0,
  MAX_CPC: 1000,
  MAX_CPM: 20000,
  MAX_ROAS: 100,
  MAX_ATC: 1e7,
  MAX_CLIQUES: 1e7,
  MAX_IMPRESSOES: 1e9,
  MAX_GASTO: 1e9,
  MAX_CONVERSAO: 2.0
};

const RESPECT_USER_FORMATTING = true;

/************ MENU + SIDEBAR ************/
function onOpen(){
  SpreadsheetApp.getUi()
    .createMenu('Financeiro')
    .addItem('Abrir painel OMD','openSidebarOMD')
    .addSeparator()
    .addItem('Importar e processar','importProcessAll')
    .addSeparator()
    .addItem('Gerar dashboard (opcional)','gerarDashboardOMD')
    .addToUi();
  try{ openSidebarOMD(); }catch(e){}
}

function openSidebarOMD(){
  const html = HtmlService.createHtmlOutputFromFile('SidebarOMD')
    .setTitle('Painel OMD');
  SpreadsheetApp.getUi().showSidebar(html);
}

function listNavGroups(){
  const ss = SpreadsheetApp.getActive();
  const have = new Set(ss.getSheets().map(s => s.getName()));
  const keep = a => a.filter(n => have.has(n));

  return [
    { title: 'Dashboard',
      tabs: keep(['Dashboard'])
    },
    { title: 'Top 10 / Produtos',
      tabs: keep(['Ink_Top10','Top10_Semanal_Qtd','Top10_Semanal_Receita',
                  'Top10_Mensal_Qtd','Top10_Mensal_Receita'])
    },
    { title: 'Resumos',
      tabs: keep([
        'Contribuição Diária',
        'DRE',
        'Resumo_Diario',
        'Resumo_Semanal',
        'Resumo_Mensal'
      ])
    },
    { title: 'Auditoria',
      tabs: keep(['Auditoria'])
    },
    { title: 'Outros',
      tabs: keep(['Painel_Meta','PnL','Despesas','_Logs'])
    },
    { title: 'Dados-fonte',
      tabs: keep(['Meta_RAW','Ink_Pedido_Itens','Pedidos_SKU','CMV_Produtos'])
    }
  ];
}

function goToSheet(name){
  const sh=SpreadsheetApp.getActive().getSheetByName(name);
  if(sh) sh.activate();
  return !!sh;
}

/************ UTILS ************/
function _ensureSheet(name, headers){
  const ss = SpreadsheetApp.getActive();
  let created = false;
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    created = true;
  }
  if (headers && headers.length){
    if (sh.getMaxColumns() < headers.length){
      sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
    }
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return {sh, created};
}

function _ensureExactHeaders_(name, headers){
  const {sh, created} = _ensureSheet(name, headers);
  const current = sh.getRange(1,1,1,Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
  let changed = created || current.length < headers.length;
  for (let i=0;i<headers.length;i++){
    if (String(current[i]||'').trim() !== String(headers[i]||'').trim()){
      changed = true;
      break;
    }
  }
  if (changed){
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return {sh, created, changed};
}

function _wipeDataKeepFormatting(sh, startRow=2){
  const lastRow = sh.getLastRow();
  const lastCol = Math.max(1, sh.getLastColumn());
  if (lastRow >= startRow){
    sh.getRange(startRow,1,lastRow-startRow+1,lastCol).clearContent();
  }
}

function _dateOnly_(dt){
  if (!(dt instanceof Date) || isNaN(dt)) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function _dateOnlyMs_(dt){
  const d=_dateOnly_(dt);
  return d ? d.getTime() : null;
}

function _sortRowsByDate_(rows, dateIdx){
  if (dateIdx < 0) return rows;
  return rows.sort((a,b)=>{
    const ad=_dateOnlyMs_(_parseDateStrict(a[dateIdx]));
    const bd=_dateOnlyMs_(_parseDateStrict(b[dateIdx]));
    if (ad==null && bd==null) return 0;
    if (ad==null) return 1;
    if (bd==null) return -1;
    if (ad!==bd) return ad-bd;
    return String(a[0]||'').localeCompare(String(b[0]||''));
  });
}

function _incomingWindow_(rows, dateIdx, floorDate){
  if (dateIdx < 0 || !rows || !rows.length) return {min:null,max:null};
  const floorMs = floorDate ? _dateOnlyMs_(floorDate) : null;
  let min=null, max=null;

  for (let i=0;i<rows.length;i++){
    const dt=_parseDateStrict(rows[i][dateIdx]);
    const ms=_dateOnlyMs_(dt);
    if (ms==null) continue;
    if (floorMs!=null && ms<floorMs) continue;
    if (min==null || ms<min) min=ms;
    if (max==null || ms>max) max=ms;
  }

  return {
    min: min==null ? null : new Date(min),
    max: max==null ? null : new Date(max)
  };
}

function _mergeRowsIncremental_(sh, headers, incomingRows, dateIdx){
  if (!INCREMENTAL_IMPORT){
    _wipeDataKeepFormatting(sh,2);
    if (incomingRows.length) sh.getRange(2,1,incomingRows.length,headers.length).setValues(incomingRows);
    return { mode:'full', preserved:0, incoming:incomingRows.length, total:incomingRows.length, min:null, max:null };
  }

  const existing = sh.getDataRange().getValues();
  const existingRows = existing.length > 1 ? existing.slice(1) : [];
  if (!incomingRows.length){
    return { mode:'noop', preserved:existingRows.length, incoming:0, total:existingRows.length, min:null, max:null };
  }

  const win = _incomingWindow_(incomingRows, dateIdx, IMMUTABLE_HISTORY_BEFORE);
  if (!win.min || !win.max){
    _wipeDataKeepFormatting(sh,2);
    if (incomingRows.length) sh.getRange(2,1,incomingRows.length,headers.length).setValues(incomingRows);
    return { mode:'replace', preserved:0, incoming:incomingRows.length, total:incomingRows.length, min:null, max:null };
  }

  const lockMs = _dateOnlyMs_(IMMUTABLE_HISTORY_BEFORE);
  const minMs = _dateOnlyMs_(win.min);
  const maxMs = _dateOnlyMs_(win.max);
  const preserved = [];

  for (let r=0;r<existingRows.length;r++){
    const row = existingRows[r];
    const dt = _parseDateStrict(row[dateIdx]);
    const ms = _dateOnlyMs_(dt);

    if (ms==null){
      preserved.push(row);
      continue;
    }
    if (lockMs!=null && ms<lockMs){
      preserved.push(row);
      continue;
    }
    if (ms<minMs || ms>maxMs){
      preserved.push(row);
      continue;
    }
  }

  const finalRows = _sortRowsByDate_(preserved.concat(incomingRows), dateIdx);
  _wipeDataKeepFormatting(sh,2);
  if (finalRows.length) sh.getRange(2,1,finalRows.length,headers.length).setValues(finalRows);

  return {
    mode:'incremental',
    preserved:preserved.length,
    incoming:incomingRows.length,
    total:finalRows.length,
    min:win.min,
    max:win.max
  };
}

function _fmtCurrencyRange(sh,c,r){
  if(r>0) sh.getRange(2,c,r,1).setNumberFormat('R$ #,##0.00');
}
function _fmtIntRange(sh,c,r){
  if(r>0) sh.getRange(2,c,r,1).setNumberFormat('#,##0');
}
function _fmtPctRange(sh,c,r){
  if(r>0) sh.getRange(2,c,r,1).setNumberFormat('0.00%');
}

function _detectDelimiter(first){
  const t=(first.match(/\t/g)||[]).length;
  const s=(first.match(/;/g)||[]).length;
  const c=(first.match(/,/g)||[]).length;
  return t>s&&t>c?'\t':(s>c?';':',');
}

function _readCsvSmart(file){
  let raw=file.getBlob().getDataAsString('UTF-8');
  if(!raw||!raw.trim()){
    raw=file.getBlob().getDataAsString('ISO-8859-1');
  }
  const first=(raw.split(/\r?\n/)[0]||'');
  const delim=_detectDelimiter(first);
  return Utilities.parseCsv(raw.replace(/\r\n/g,'\n'),delim)
    .map(r=>r.map(v=>typeof v==='string'?v.trim():v));
}

function _padRow_(row, len){
  const out = (row || []).slice(0, len);
  while (out.length < len) out.push('');
  return out;
}

function _findHeaderIndex_(normHeaders, candidates){
  for (let i=0;i<normHeaders.length;i++){
    const h = normHeaders[i];
    for (const c of candidates){
      const n = _norm(c);
      if (h === n || h.includes(n)) return i;
    }
  }
  return -1;
}

function _norm(s){
  return String(s||'')
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[()]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function _parseNumBR(x){
  if (x===null||x===undefined||x==='') return null;
  if (typeof x==='number') return x;

  let t = String(x).trim().replace(/[^\d.,\-]/g,'');
  if (!t) return null;

  const hasComma = t.includes(',');
  const hasDot = t.includes('.');

  if (hasComma){
    t = t.replace(/\./g,'');
    t = t.replace(/,/g,'.');
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  }

  if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(t)){
    t = t.replace(/\./g,'');
  }

  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function _parseDateStrict(x){
  if (x instanceof Date && !isNaN(x)) return x;

  const s=String(x||'').trim();
  if(!s) return null;

  let m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if(m){
    const y=+m[1], mo=+m[2]-1, d=+m[3];
    const dt=new Date(y,mo,d);
    return isNaN(dt)?null:dt;
  }

  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m){
    const d=+m[1], mo=+m[2]-1, y=+m[3];
    const dt=new Date(y,mo,d);
    return isNaN(dt)?null:dt;
  }

  const dt=new Date(s);
  return isNaN(dt)?null:dt;
}

function mapColumnsByAliasesAllowMissing_(srcHeaders, aliasMap){
  const normSrc=(srcHeaders||[]).map(_norm);
  const out={};

  for (const canonical in aliasMap){
    const aliases=[canonical].concat(aliasMap[canonical]||[]).map(_norm);
    let found=-1;

    for (const a of aliases){
      const i=normSrc.indexOf(a);
      if(i!==-1){ found=i; break; }
    }

    if (found===-1){
      for(let i=0;i<normSrc.length;i++){
        for(const a of aliases){
          if(normSrc[i].includes(a)){ found=i; break; }
        }
        if(found!==-1) break;
      }
    }

    out[canonical]=found;
  }

  return out;
}

function _findLatestCsvInFolder(folder,regex){
  const it=folder.getFiles();
  let file=null, ts=0;

  while(it.hasNext()){
    const f=it.next();
    const n=f.getName().toLowerCase();
    if(!n.endsWith('.csv')||!regex.test(n)) continue;
    const t=f.getLastUpdated().getTime();
    if(t>=ts){ file=f; ts=t; }
  }
  return file;
}

/************ HEADERS & ALIASES ************/
const PEDIDOS_HEADERS=[
  'Pedido','Data','Método de Pagamento','Status de Pagamento','Cliente',
  'Items no Pedido','Valor do Pedido','Nome do Cupom','Valor do Desconto',
  'Comissao','Origem','Estado da Entrega','Rua da Entrega','Link de Rastreio'
];

const PEDIDOS_ALIASES={
  'Pedido':['order id','id do pedido'],
  'Data':['order date','date'],
  'Método de Pagamento':['payment method'],
  'Status de Pagamento':['payment status'],
  'Cliente':['customer','buyer','nome do cliente'],
  'Items no Pedido':['itens no pedido','items','qtd itens'],
  'Valor do Pedido':['order value','order total','total'],
  'Nome do Cupom':['cupom','coupon'],
  'Valor do Desconto':['discount value','discount'],
  'Comissao':['commission'],
  'Origem':['source'],
  'Estado da Entrega':['uf','shipping state'],
  'Rua da Entrega':['shipping address','logradouro'],
  'Link de Rastreio':['tracking url','tracking link']
};

const ITENS_HEADERS=[
  'Pedido','Data','Cliente','Produto','Especificações','Quantidade','Valor Bruto',
  'SKU','CMV_Unit','CMV_Total'
];

const ITENS_ALIASES={
  'Pedido':['pedido','id do pedido','order id'],
  'Data':['data','order date','date'],
  'Cliente':['nome do cliente','cliente','customer'],
  'Produto':['nome do produto','produto','item'],
  'Especificações':['especificações do produto','variação','sku','especificacoes'],
  'Quantidade':['quantidade','qtd','qty'],
  'Valor Bruto':['valor bruto','preço','price','valor']
};

const PEDIDOS_SKU_ALIASES={
  'Pedido':['numero do pedido','número do pedido','pedido','id do pedido','order id'],
  'Data':['data','order date'],
  'Produto':['produto','descrição do produto','descricao do produto','descrição','descricao','nome do produto'],
  'SKU':['codigo (sku)','código (sku)','id produto','id do produto','sku','codigo sku','código sku'],
  'Quantidade':['quantidade','qtd','qty']
};

const META_ALIASES = {
  Data: ['dia','data','start date','reporting starts','inicio dos relatorios'],
  Campanha: ['campanha','campaign name','nome da campanha'],
  Conjunto: ['conjunto','ad set name','nome do conjunto de anuncios'],
  Anúncio: ['ad name','anuncio','nome do anuncio'],
  Impressões: ['impressions','impressões','impressoes'],
  Alcance: ['reach','alcance'],
  Cliques: ['link clicks','cliques','cliques no link'],
  ATC: ['adds to cart','adicionou ao carrinho'],
  'Valor Conversões': [
    'purchase conversion value',
    'valor de conversão',
    'valor de conversao',
    'valor de conversão da compra',
    'valor de conversao da compra'
  ],
  Gasto: [
    'amount spent',
    'valor gasto',
    'valor usado',
    'valor usado brl',
    'valor usado (brl)',
    'valor usado (brl) ',
    'valor usado em brl'
  ],
  'Custo por compra': ['custo por compra','cost per purchase','cpp']
};

/************ STATUS ************/
function _isStatusPagoLike_(s){
  const n=_norm(s||'');
  return /(pago|aprovado|confirmado|capturad|concluid|complet|pix.*conclu|pix.*aprovad)/.test(n);
}

/************ CMV: sheet base ************/
function _ensureCMVSheet_(){
  const {sh, created} = _ensureExactHeaders_('CMV_Produtos',
    ['Produto','CMV_Unit','SKU','Price','Sale_Price','Tipo']);
  if(created) sh.autoResizeColumns(1,6);
  return sh;
}

function _ensureCMVVigenciasSheet_(){
  const headers=['Tipo','Produto','SKU','CMV_Unit','Vigencia_Inicio','Vigencia_Fim','Escala','Observacao'];
  const {sh, created} = _ensureExactHeaders_('CMV_Vigencias', headers);
  if (created || sh.getLastRow() < 2){
    const rows = [
      ['Camiseta','','',49.90,new Date(2025,0,1),new Date(2026,2,1),'INKrível / Escala','Custo inicial provisório. Ajuste se houver custo antigo diferente.'],
      ['Camiseta Peruana','','',65.00,new Date(2025,0,1),new Date(2026,2,1),'INKrível / Escala','Custo inicial provisório. Ajuste se houver custo antigo diferente.'],
      ['Mini','','',46.00,new Date(2025,0,1),new Date(2026,2,1),'INKrível / Escala','Custo inicial provisório. Ajuste se houver custo antigo diferente.'],
      ['Body','','',46.00,new Date(2025,0,1),new Date(2026,2,1),'INKrível / Escala','Custo inicial provisório. Ajuste se houver custo antigo diferente.'],
      ['Oversized','','',75.00,new Date(2025,0,1),new Date(2026,2,1),'INKrível / Escala','Custo inicial provisório. Ajuste se houver custo antigo diferente.'],
      ['Regata','','',46.00,new Date(2025,0,1),new Date(2026,2,1),'INKrível / Escala','Custo inicial provisório. Ajuste se houver custo antigo diferente.'],
      ['Cropped','','',44.00,new Date(2025,0,1),new Date(2026,2,1),'INKrível / Escala','Custo inicial provisório. Ajuste se houver custo antigo diferente.'],
      ['Boné Dad Hat','','',46.00,new Date(2025,0,1),new Date(2026,2,1),'INKrível / Escala','Custo inicial provisório. Ajuste se houver custo antigo diferente.'],
      ['Camiseta','','',49.90,new Date(2026,2,2),'','INKrível / Escala','Preço base informado no print de 02/03/2026.'],
      ['Camiseta Peruana','','',65.00,new Date(2026,2,2),'','INKrível / Escala','Preço base informado no print de 02/03/2026.'],
      ['Mini','','',46.00,new Date(2026,2,2),'','INKrível / Escala','Preço base informado no print de 02/03/2026.'],
      ['Body','','',46.00,new Date(2026,2,2),'','INKrível / Escala','Preço base informado no print de 02/03/2026.'],
      ['Oversized','','',75.00,new Date(2026,2,2),'','INKrível / Escala','Preço base informado no print de 02/03/2026.'],
      ['Regata','','',46.00,new Date(2026,2,2),'','INKrível / Escala','Preço base informado no print de 02/03/2026.'],
      ['Cropped','','',44.00,new Date(2026,2,2),'','INKrível / Escala','Preço base informado no print de 02/03/2026.'],
      ['Boné Dad Hat','','',46.00,new Date(2026,2,2),'','INKrível / Escala','Preço base informado no print de 02/03/2026.']
    ];
    sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  }
  const rows = Math.max(sh.getLastRow()-1,1);
  _fmtCurrencyRange(sh,4,rows);
  sh.getRange(2,5,rows,2).setNumberFormat('yyyy-MM-dd');
  return sh;
}

function _canonicalType_(value){
  const n = _norm(value||'');
  if (!n) return '';
  if (n.includes('algodao peruano')) return 'Camiseta Peruana';
  if (n.includes('oversized')) return 'Oversized';
  if (n.includes('cropped')) return 'Cropped';
  if (n.includes('regata')) return 'Regata';
  if (n.includes('body')) return 'Body';
  if (n === 'mini' || n.includes('camiseta infantil') || n.includes('infantil')) return 'Mini';
  if (n.includes('dad hat') || n.includes('bone dad hat') || n.includes('boné') || n == 'bone') return 'Boné Dad Hat';
  if (n.includes('camiseta')) return 'Camiseta';
  return '';
}

function _loadCMVVigencias_(){
  const sh = _ensureCMVVigenciasSheet_();
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  const H = vals[0].map(_norm);
  const iTipo = H.indexOf(_norm('Tipo'));
  const iProd = H.indexOf(_norm('Produto'));
  const iSku  = H.indexOf(_norm('SKU'));
  const iCmv  = H.indexOf(_norm('CMV_Unit'));
  const iIni  = H.indexOf(_norm('Vigencia_Inicio'));
  const iFim  = H.indexOf(_norm('Vigencia_Fim'));
  const rows = [];
  for (let r=1;r<vals.length;r++){
    const row = vals[r];
    const cmv = _parseNumBR(row[iCmv]);
    if (cmv == null) continue;
    rows.push({
      tipo: _canonicalType_(row[iTipo]),
      produto: String(row[iProd]||'').trim(),
      sku: String(row[iSku]||'').trim(),
      cmv: cmv,
      ini: _parseDateStrict(row[iIni]),
      fim: _parseDateStrict(row[iFim])
    });
  }
  rows.sort((a,b)=>{
    const as=(a.sku?3:(a.produto?2:(a.tipo?1:0)));
    const bs=(b.sku?3:(b.produto?2:(b.tipo?1:0)));
    if (as !== bs) return bs-as;
    return (_dateOnlyMs_(b.ini)||0)-(_dateOnlyMs_(a.ini)||0);
  });
  return rows;
}

function _resolveCMVByDateAndKey_(dt, tipo, sku, produto){
  const rows = _loadCMVVigencias_();
  const ms = _dateOnlyMs_(dt || new Date()) || _dateOnlyMs_(new Date());
  const nTipo = _canonicalType_(tipo);
  const nSku = _norm(sku||'');
  const nProd = _norm(produto||'');

  function active(rec){
    const ini = _dateOnlyMs_(rec.ini);
    const fim = _dateOnlyMs_(rec.fim);
    if (ini != null && ms < ini) return false;
    if (fim != null && ms > fim) return false;
    return true;
  }

  for (const rec of rows){
    if (!active(rec)) continue;
    if (rec.sku && nSku && _norm(rec.sku) === nSku) return rec.cmv;
  }
  for (const rec of rows){
    if (!active(rec)) continue;
    if (rec.produto && nProd && _norm(rec.produto) === nProd) return rec.cmv;
  }
  for (const rec of rows){
    if (!active(rec)) continue;
    if (rec.tipo && nTipo && rec.tipo === nTipo) return rec.cmv;
  }
  return null;
}

function _detectTypeFromFeedOrTitle_(produto, desc, feedType, feedTitle, sku){
  const guesses = [feedType, feedTitle, produto, desc, sku];
  for (const g of guesses){
    const t = _canonicalType_(g);
    if (t) return t;
  }
  return 'Camiseta';
}

/************ TOP10 ************/
function _writeTop10Sheet(topQty,totalQty,topRev,totalRev){
  const {sh}=_ensureSheet(
    'Ink_Top10',
    ['Rank','Produto','Qtd','Participação %','', 'Rank','Produto','Receita Bruta','Participação %']
  );
  _wipeDataKeepFormatting(sh,2);

  const rows1=topQty.map((e,i)=>[i+1,e.produto,e.qtd,totalQty?e.qtd/totalQty:0]);
  if(rows1.length) sh.getRange(2,1,rows1.length,4).setValues(rows1);
  _fmtIntRange(sh,3,rows1.length);
  _fmtPctRange(sh,4,rows1.length);

  const rows2=topRev.map((e,i)=>[i+1,e.produto,e.valor,totalRev?e.valor/totalRev:0]);
  if(rows2.length) sh.getRange(2,6,rows2.length,4).setValues(rows2);
  _fmtCurrencyRange(sh,8,rows2.length);
  _fmtPctRange(sh,9,rows2.length);
}

function _periodWeekKey(dt,tz){
  const y=dt.getFullYear();
  const w=Utilities.formatDate(dt,tz,"w");
  return y+"-S"+w;
}

function _periodMonthKey(dt,tz){
  return Utilities.formatDate(dt,tz,"yyyy-MM");
}

function _emitTop10Sheet_(name,mapAgg,mode){
  const headers=['Período','Rank','Produto',mode==='qtd'?'Qtd':'Receita Bruta','Participação %'];
  const {sh}=_ensureSheet(name, headers);
  _wipeDataKeepFormatting(sh,2);

  const out=[], periods=Object.keys(mapAgg).sort();
  periods.forEach(p=>{
    const agg=mapAgg[p];
    let total=0;
    const rows=[];

    Object.keys(agg).forEach(prod=>{
      const q=agg[prod].qtd||0, v=agg[prod].valor||0;
      total+=(mode==='qtd'?q:v);
      rows.push({produto:prod,qtd:q,valor:v});
    });

    const top=rows.sort((a,b)=>mode==='qtd'?(b.qtd-a.qtd):(b.valor-a.valor)).slice(0,10);
    top.forEach((e,i)=>{
      const val=mode==='qtd'?e.qtd:e.valor;
      out.push([p,i+1,e.produto,val,total?(val/total):0]);
    });
  });

  if(out.length){
    sh.getRange(2,1,out.length,headers.length).setValues(out);
    const r=out.length;
    if(mode==='qtd'){
      _fmtIntRange(sh,4,r);
    } else {
      _fmtCurrencyRange(sh,4,r);
    }
    _fmtPctRange(sh,5,r);
  }
}

function gerarTop10Periodos(){
  const ss=SpreadsheetApp.getActive(), tz=ss.getSpreadsheetTimeZone();
  const sh=ss.getSheetByName('Ink_Pedido_Itens');
  if(!sh) throw new Error('Preciso da aba Ink_Pedido_Itens.');

  const vals=sh.getDataRange().getValues();
  if(vals.length<2) return;

  const head=vals[0].map(v=>String(v||'')), norm=head.map(_norm);
  const iData=norm.findIndex(h=>/(^|\b)(data|date|day)(\b|$)/.test(h));
  const iProd=norm.findIndex(h=>/(produto|item|nome do produto)/.test(h));
  const iQtd =norm.findIndex(h=>/(quantidade|qtd|qty)/.test(h));
  const iVal =norm.findIndex(h=>/(valor bruto|preco|preç|price|valor)/.test(h));
  if (iData<0||iProd<0||iQtd<0||iVal<0){
    throw new Error('Cabeçalhos não reconhecidos em Ink_Pedido_Itens.');
  }

  const semAggQty={}, semAggVal={}, mesAggQty={}, mesAggVal={};
  for(let r=1;r<vals.length;r++){
    const row=vals[r];
    if(!row||row.every(v=>String(v||'').trim()==='')) continue;
    const dt=_parseDateStrict(row[iData]);
    if(!dt) continue;
    if(ENFORCE_CUTOFF && dt<CUTOFF_DATE) continue;

    const prod=String(row[iProd]||'Sem nome').trim();
    const qtd=_parseNumBR(row[iQtd])||0;
    const val=_parseNumBR(row[iVal])||0;
    const wk=_periodWeekKey(dt,tz), mo=_periodMonthKey(dt,tz);

    for (const [map, key] of [[semAggQty,wk],[semAggVal,wk],[mesAggQty,mo],[mesAggVal,mo]]){
      if(!map[key]) map[key]={};
      if(!map[key][prod]) map[key][prod]={qtd:0,valor:0};
      map[key][prod].qtd+=qtd;
      map[key][prod].valor+=val;
    }
  }

  _emitTop10Sheet_('Top10_Semanal_Qtd', semAggQty, 'qtd');
  _emitTop10Sheet_('Top10_Semanal_Receita', semAggVal, 'valor');
  _emitTop10Sheet_('Top10_Mensal_Qtd', mesAggQty, 'qtd');
  _emitTop10Sheet_('Top10_Mensal_Receita', mesAggVal, 'valor');
}

/************ WRITERS: PEDIDOS ************/
function _writePedidosRawNormalized(csv){
  if(!csv||csv.length<2) throw new Error('CSV Pedidos vazio.');
  const {sh, created} = _ensureSheet('Pedidos_RAW', PEDIDOS_HEADERS);

  const srcHeader=(csv[0]||[]).map(v=>String(v||'').trim());
  const map=mapColumnsByAliasesAllowMissing_(srcHeader,PEDIDOS_ALIASES);
  const numericCols=new Set(['Items no Pedido','Valor do Pedido','Valor do Desconto','Comissao']);
  const dateCols=new Set(['Data']);
  const out=[], vals=[];

  for(let r=1;r<csv.length;r++){
    const row=csv[r];
    if(!row||row.every(v=>String(v||'').trim()==='')) continue;

    const dt=_parseDateStrict(row[map['Data']]);
    const st=String(row[map['Status de Pagamento']]||'').trim();
    if (st && !_isStatusPagoLike_(st)) continue;
    if (ENFORCE_CUTOFF && dt && dt<CUTOFF_DATE) continue;

    const o=[];
    for (const h of PEDIDOS_HEADERS){
      const idx=map[h];
      const raw=(idx>=0)?row[idx]:'';
      if (dateCols.has(h)) {
        o.push(_parseDateStrict(raw));
      } else if (numericCols.has(h)){
        let v=_parseNumBR(raw);
        if((h==='Valor do Desconto'||h==='Comissao')&&(v==null)) v=0;
        o.push(v);
      } else {
        o.push(raw===undefined?'':String(raw).trim());
      }
    }
    out.push(o);
    vals.push({
      pedido:_parseNumBR(row[map['Valor do Pedido']])||0,
      desc:_parseNumBR(row[map['Valor do Desconto']])||0
    });
  }

  const merge=_mergeRowsIncremental_(sh, PEDIDOS_HEADERS, out, 1);
  if(merge.total){
    const H=PEDIDOS_HEADERS, col=h=>H.indexOf(h)+1;
    if (!RESPECT_USER_FORMATTING || created){
      sh.getRange(2,col('Data'),merge.total,1).setNumberFormat('yyyy-MM-dd');
      ['Valor do Pedido','Valor do Desconto','Comissao'].forEach(h=>_fmtCurrencyRange(sh,col(h),merge.total));
      _fmtIntRange(sh,col('Items no Pedido'),merge.total);
    }
  }

  const bruto=vals.reduce((a,b)=>a+b.pedido,0);
  const liquido=vals.reduce((a,b)=>a+b.pedido-b.desc,0);
  return { rows: out.length, bruto, liquido, merge };
}

/************ WRITERS: ITENS ************/
function _writeItensNormalized(csv){
  const {sh, created} = _ensureSheet('Ink_Pedido_Itens', ITENS_HEADERS);

  const map=mapColumnsByAliasesAllowMissing_(csv[0],ITENS_ALIASES);
  const out=[];
  const byProdQty={}, byProdRev={};
  let totalQty=0, totalRev=0;

  for (let r=1;r<csv.length;r++){
    const row=csv[r];
    if(!row||row.every(v=>String(v||'').trim()==='')) continue;

    const dt=_parseDateStrict(row[map['Data']]);
    if(ENFORCE_CUTOFF && dt && dt<CUTOFF_DATE) continue;

    const produto=(row[map['Produto']]||'').toString().trim()||'Sem nome';
    const qtd=_parseNumBR(row[map['Quantidade']])||0;
    const val=_parseNumBR(row[map['Valor Bruto']])||0;

    out.push([
      row[map['Pedido']]||'',
      dt,
      row[map['Cliente']]||'',
      produto,
      row[map['Especificações']]||'',
      qtd,
      val,
      '',
      '',
      ''
    ]);

    byProdQty[produto]=(byProdQty[produto]||0)+qtd;
    byProdRev[produto]=(byProdRev[produto]||0)+val;
    totalQty+=qtd;
    totalRev+=val;
  }

  const merge=_mergeRowsIncremental_(sh, ITENS_HEADERS, out, 1);
  if(merge.total){
    if (!RESPECT_USER_FORMATTING || created){
      sh.getRange(2,2,merge.total,1).setNumberFormat('yyyy-MM-dd');
      _fmtIntRange(sh,6,merge.total);
      _fmtCurrencyRange(sh,7,merge.total);
      _fmtCurrencyRange(sh,9,merge.total);
      _fmtCurrencyRange(sh,10,merge.total);
    }
  }

  const topQty = Object.keys(byProdQty)
    .map(k=>({produto:k,qtd:byProdQty[k]}))
    .sort((a,b)=>b.qtd-a.qtd)
    .slice(0,10);

  const topRev = Object.keys(byProdRev)
    .map(k=>({produto:k,valor:byProdRev[k]}))
    .sort((a,b)=>b.valor-a.valor)
    .slice(0,10);

  _writeTop10Sheet(topQty,totalQty,topRev,totalRev);
  return { rows: out.length, topQty, topRev, totalQty, totalRev, merge };
}

/************ WRITER: Pedidos_SKU ************/
function _writePedidosSku(csv){
  if(!csv || csv.length<2) return 0;

  const headers = ['Pedido','Data','Produto','SKU','Quantidade'];
  const {sh, created} = _ensureSheet('Pedidos_SKU', headers);

  const srcHeader=(csv[0]||[]).map(v=>String(v||'').trim());
  const map=mapColumnsByAliasesAllowMissing_(srcHeader, PEDIDOS_SKU_ALIASES);
  const skuAltMap=mapColumnsByAliasesAllowMissing_(srcHeader, {'SKU_ALT':['id produto','id do produto']});
  const iSkuAlt=skuAltMap['SKU_ALT'];
  const iPedido=map['Pedido'], iData=map['Data'], iProd=map['Produto'], iSku=map['SKU'], iQtd=map['Quantidade'];

  if(iPedido<0 || iData<0 || (iSku<0 && iSkuAlt<0)){
    throw new Error('Cabeçalhos não reconhecidos em pedidos.csv para Pedidos_SKU.');
  }

  const out=[];
  for(let r=1;r<csv.length;r++){
    const row=csv[r];
    if(!row || row.every(v=>String(v||'').trim()==='')) continue;

    const dt=_parseDateStrict(row[iData]);
    if(ENFORCE_CUTOFF && dt && dt<CUTOFF_DATE) continue;

    const sku=(iSku>=0 ? row[iSku] : '') || (iSkuAlt>=0 ? row[iSkuAlt] : '') || '';
    out.push([
      row[iPedido]||'',
      dt,
      iProd>=0 ? (row[iProd]||'') : '',
      sku,
      iQtd>=0 ? (_parseNumBR(row[iQtd])||1) : 1
    ]);
  }

  const merge=_mergeRowsIncremental_(sh, headers, out, 1);
  if(merge.total){
    if(!RESPECT_USER_FORMATTING || created){
      sh.getRange(2,2,merge.total,1).setNumberFormat('yyyy-MM-dd');
      _fmtIntRange(sh,5,merge.total);
    }
  }

  return { rows: out.length, merge };
}

/************ META: CLASSIFIER + FULL NORMALIZATION ************/
function _classifyMetaHeaders(header){
  const n = header.map(_norm);
  const moneyIdx=[], intIdx=[], pctIdx=[], ratioIdx=[], dateIdx=[];
  const is = (i,rx)=> rx.test(n[i]);

  for (let i=0;i<n.length;i++){
    if (is(i,/(^|\b)(dia|data|inicio dos relatorios|inicio|start|termino dos relatorios|termino|end)(\b|$)/)) { dateIdx.push(i); continue; }
    if (is(i,/(impress(|oes|oes)|alcance|cliques?(?!.*link)|visualizac|visualizacoes$|compras$|adds to cart|instala|leads)/)) { intIdx.push(i); continue; }
    if (is(i,/(valor usado|amount spent|gasto|custo por compra|cpc\b|cpm\b|cpa\b|cpp\b|cpl\b|custo por 1\.000|preco|price|revenue|valor de conversao|conversion value|brl)/)) { moneyIdx.push(i); continue; }
    if (is(i,/(ctr|taxa|rate|taxa de compras|taxa de visualizac|%)/)) { pctIdx.push(i); continue; }
    if (is(i,/(roas|frequencia|frequência)/)) { ratioIdx.push(i); continue; }
  }
  return {moneyIdx,intIdx,pctIdx,ratioIdx,dateIdx};
}

function _applySanityMetaRow_(obj){
  if (!APPLY_SANITY_FILTERS) return obj;
  const clamp=(v,max)=> v==null?null:(v>max?max:(v<0?0:v));
  if ('CTR' in obj) obj.CTR=clamp(obj.CTR,SANITY.MAX_CTR);
  if ('CPC' in obj) obj.CPC=clamp(obj.CPC,SANITY.MAX_CPC);
  if ('CPM' in obj) obj.CPM=clamp(obj.CPM,SANITY.MAX_CPM);
  if ('ROAS' in obj) obj.ROAS=clamp(obj.ROAS,SANITY.MAX_ROAS);
  return obj;
}

function _writeMetaAllFields(csv){
  if(!csv||!csv.length) return 0;

  const header = csv[0].map(h=>String(h||'').trim());
  const cls = _classifyMetaHeaders(header);
  const extraNames=['CTR_calc','CPC_calc','CPM_calc','Frequencia_calc','ROAS_calc','Custo_por_compra_calc'];
  const outHeader = header.concat(extraNames);

  const {sh} = _ensureSheet('Meta_RAW', outHeader);

  const HN=header.map(_norm);
  const idxByAlias = (name, aliases=[]) => {
    for (const a of [name].concat(aliases||[])){
      const i = HN.indexOf(_norm(a));
      if (i>=0) return i;
    }
    return -1;
  };

  const iDia   = idxByAlias('Data', META_ALIASES.Data);
  const iGasto = idxByAlias('Valor usado (BRL)', META_ALIASES.Gasto);
  const iImps  = idxByAlias('Impressões', META_ALIASES.Impressões);
  const iAlc   = idxByAlias('Alcance', META_ALIASES.Alcance);
  const iClink = idxByAlias('Cliques no link', META_ALIASES.Cliques);
  const iClicksAll = HN.indexOf(_norm('Cliques (todos)'));
  const iCompras = HN.indexOf('compras')>-1 ? HN.indexOf('compras') : HN.indexOf('purchases');
  const iConvVal = idxByAlias('Valor de conversão da compra (BRL)', META_ALIASES['Valor Conversões']);
  const iCustoCompra = idxByAlias('Custo por compra', META_ALIASES['Custo por compra']);
  const iFreq = HN.indexOf('frequencia')>-1 ? HN.indexOf('frequencia') : HN.indexOf('frequência');
  const iCTR  = HN.indexOf('ctr');
  const iCPC  = HN.indexOf('cpc');
  const iCPM  = HN.indexOf('cpm');
  const iROAS = HN.indexOf('roas');

  const outRows=[];
  for (let r=1;r<csv.length;r++){
    const row = csv[r];
    if(!row||row.every(v=>String(v||'').trim()==='')) continue;

    const arr = row.slice();

    cls.dateIdx.forEach(i => arr[i] = _parseDateStrict(row[i]));
    cls.intIdx.forEach (i => arr[i] = _parseNumBR(row[i])||0);
    cls.moneyIdx.forEach(i => arr[i] = _parseNumBR(row[i])||0);
    cls.pctIdx.forEach  (i => {
      let v=String(row[i]||'').replace('%','');
      let n=_parseNumBR(v);
      arr[i]=(n==null?null:(n>1.5?n/100:n));
    });
    cls.ratioIdx.forEach(i => arr[i] = _parseNumBR(row[i]));

    if (ENFORCE_CUTOFF && iDia>=0){
      const dt = arr[iDia];
      if (dt && dt < CUTOFF_DATE) continue;
    }

    const gasto   = iGasto>=0   ? (_parseNumBR(arr[iGasto])||0) : 0;
    const imps    = iImps >=0   ? (_parseNumBR(arr[iImps])||0)  : 0;
    const alcance = iAlc  >=0   ? (_parseNumBR(arr[iAlc])||0)   : 0;
    const cliques = iClink>=0   ? (_parseNumBR(arr[iClink])||0)
                  : (iClicksAll>=0? (_parseNumBR(arr[iClicksAll])||0) : 0);
    const compras = iCompras>=0 ? (_parseNumBR(arr[iCompras])||0) : 0;
    const convVal = iConvVal>=0 ? (_parseNumBR(arr[iConvVal])||0) : 0;

    let CTR  = imps ? cliques/imps : 0;
    let CPC  = cliques ? gasto/cliques : null;
    let CPM  = imps ? gasto*1000/imps : null;
    let FREQ = alcance ? (imps/alcance) : null;
    let ROAS = gasto ? convVal/gasto : null;
    let CPCompra = compras ? gasto/compras : (iCustoCompra>=0 ? _parseNumBR(arr[iCustoCompra]) : null);

    if (iCTR>=0)  arr[iCTR]=CTR;
    if (iCPC>=0)  arr[iCPC]=CPC;
    if (iCPM>=0)  arr[iCPM]=CPM;
    if (iFreq>=0) arr[iFreq]=FREQ;
    if (iROAS>=0) arr[iROAS]=ROAS;
    if (iCustoCompra>=0) arr[iCustoCompra]=CPCompra;

    const sane=_applySanityMetaRow_({CTR,CPC,CPM,ROAS});
    CTR=sane.CTR; CPC=sane.CPC; CPM=sane.CPM; ROAS=sane.ROAS;

    outRows.push(arr.concat([CTR,CPC,CPM,FREQ,ROAS,CPCompra]));
  }

  const merge=_mergeRowsIncremental_(sh, outHeader, outRows, iDia);
  if (merge.total){
    const rows=merge.total;
    const ci = name => outHeader.indexOf(name)+1;

    const dIdx=_classifyMetaHeaders(outHeader).dateIdx;
    if (dIdx.length) sh.getRange(2,dIdx[0]+1,rows,1).setNumberFormat('yyyy-MM-dd');

    _fmtPctRange(sh, ci('CTR_calc'), rows);
    _fmtCurrencyRange(sh, ci('CPC_calc'), rows);
    _fmtCurrencyRange(sh, ci('CPM_calc'), rows);
    _fmtCurrencyRange(sh, ci('Custo_por_compra_calc'), rows);
    sh.getRange(2, ci('Frequencia_calc'), rows,1).setNumberFormat('0.00');
    sh.getRange(2, ci('ROAS_calc'), rows,1).setNumberFormat('0.00');

    if (iGasto>=0) _fmtCurrencyRange(sh, iGasto+1, rows);
    if (iCPC>=0)   _fmtCurrencyRange(sh, iCPC+1, rows);
    if (iCPM>=0)   _fmtCurrencyRange(sh, iCPM+1, rows);
    if (iCustoCompra>=0) _fmtCurrencyRange(sh, iCustoCompra+1, rows);
    if (iCTR>=0)   _fmtPctRange(sh, iCTR+1, rows);
  }

  return { rows: outRows.length, merge };
}

/************ IMPORT + PIPELINE ************/
function importFromDriveAndNormalize(){
  const folder=DriveApp.getFolderById(FOLDER_ID);
  const fPedidos=_findLatestCsvInFolder(folder,/(pedidos_raw|lista de pedidos|lista_de_pedidos)/i);
  const fItens  =_findLatestCsvInFolder(folder,/(pedidos_?itens|ink_pedido_itens|lista de itens|lista_de_itens)/i);
  const fMeta   =_findLatestCsvInFolder(folder,/(meta_raw|meta export)/i);
  const fFeed   =_findLatestCsvInFolder(folder,/(facebook|store|ink|feed).*\.csv/i);
  const fPedidosCsv=_findLatestCsvInFolder(folder,/(^pedidos(?:\s*\(\d+\))?\.csv$|pedidos pagos)/i);

  if(!fPedidos && !fItens && !fMeta && !fFeed && !fPedidosCsv){
    SpreadsheetApp.getUi().alert(
      'Esperados: Lista de Pedidos/Pedidos_RAW, Lista de Itens/Pedidos_Itens, Meta Export/Meta_RAW, feed_facebook e Pedidos Pagos/pedidos.csv na pasta do Drive.'
    );
    return;
  }

  _ensureCMVSheet_();
  _ensureCMVVigenciasSheet_();

  let statP=null, statI=null, statM=null, statPS=null;
  if (fPedidos)   statP=_writePedidosRawNormalized(_readCsvSmart(fPedidos));
  if (fItens)     statI=_writeItensNormalized(_readCsvSmart(fItens));
  if (fMeta)      statM=_writeMetaAllFields(_readCsvSmart(fMeta));
  if (fFeed)      updateCMVProdutosFromFeed();
  if (fPedidosCsv)statPS=_writePedidosSku(_readCsvSmart(fPedidosCsv));

  const lastTab=fMeta?'Meta_RAW':(fItens?'Ink_Top10':'Pedidos_RAW');
  if (lastTab) _ensureSheet(lastTab).sh.activate();
  SpreadsheetApp.flush();

  const msg=[
    '📊 Importação',
    fPedidos?('Pedidos_RAW: '+fPedidos.getName()+' linhas '+(statP?statP.rows:0)):'Pedidos_RAW: -',
    fItens?('Itens: '+fItens.getName()+' linhas '+((statI&&statI.rows)||statI||0)):'Itens: -',
    fMeta?('Meta: '+fMeta.getName()+' linhas '+((statM&&statM.rows)||statM||0)):'Meta: -',
    fFeed?('Feed: '+fFeed.getName()+' → CMV_Produtos atualizado'):'Feed: -',
    fPedidosCsv?('Pedidos_SKU: '+fPedidosCsv.getName()+' linhas '+((statPS&&statPS.rows)||statPS||0)):'Pedidos_SKU: -'
  ].join(' | ');
  SpreadsheetApp.getActive().toast(msg,'Concluído ✅',8);
}

/************ ENRIQUECER ITENS COM SKU + CMV ************/
function enrichInkItensWithSKUeCMV(){
  const ss = SpreadsheetApp.getActive();
  const shItens = ss.getSheetByName('Ink_Pedido_Itens');
  const shPed   = ss.getSheetByName('Pedidos_SKU');
  const shCmv   = ss.getSheetByName('CMV_Produtos');
  if (!shItens || !shPed || !shCmv) throw new Error('Preciso de Ink_Pedido_Itens, Pedidos_SKU e CMV_Produtos.');

  const itens = shItens.getDataRange().getValues();
  if (itens.length < 2) return;

  const headI = itens[0].slice();
  const nI = headI.map(_norm);
  const iPedido = nI.indexOf('pedido');
  const iData   = nI.findIndex(h=>/(^|\b)(data|date|day)(\b|$)/.test(h));
  const iProd   = nI.findIndex(h=>/(produto|nome do produto|item)/.test(h));
  const iQtd    = nI.findIndex(h=>/(quantidade|qtd|qty)/.test(h));
  if (iPedido<0 || iQtd<0 || iProd<0) throw new Error('Cabeçalhos de Ink_Pedido_Itens não reconhecidos.');

  function ensureCol(name){
    let idx = headI.indexOf(name);
    if (idx === -1){
      headI.push(name);
      for (let r=1;r<itens.length;r++) itens[r].push('');
      idx = headI.length - 1;
    }
    return idx;
  }

  const iSkuCol     = ensureCol('SKU');
  const iTipoCol    = ensureCol('Tipo');
  const iCmvUnitCol = ensureCol('CMV_Unit');
  const iCmvTotCol  = ensureCol('CMV_Total');

  const pedVals = shPed.getDataRange().getValues();
  const nP = pedVals[0].map(_norm);
  const pPedido = nP.indexOf('pedido');
  const pProd   = nP.findIndex(h=>/(produto|descricao do produto|descrição do produto|descrição|descricao)/.test(h));
  const pSku    = nP.indexOf('sku');
  const pQtd    = nP.findIndex(h=>/(quantidade|qtd|qty)/.test(h));
  if (pPedido<0 || pSku<0) throw new Error('Cabeçalhos de Pedidos_SKU não reconhecidos.');

  const byOrder = {};
  for (let r=1;r<pedVals.length;r++){
    const id   = String(pedVals[r][pPedido]||'').trim();
    if (!id) continue;
    const item = {
      prod: pProd>=0 ? String(pedVals[r][pProd]||'').trim() : '',
      sku: String(pedVals[r][pSku]||'').trim(),
      qtd: pQtd>=0 ? (_parseNumBR(pedVals[r][pQtd])||1) : 1,
      used: false
    };
    if (!byOrder[id]) byOrder[id] = [];
    byOrder[id].push(item);
  }

  const cmvVals = shCmv.getDataRange().getValues();
  const hC = cmvVals[0].map(_norm);
  const cProd = hC.indexOf('produto');
  const cCmv  = hC.indexOf('cmv_unit');
  const cSku  = hC.indexOf('sku');
  const cTipo = hC.indexOf('tipo');

  const cmvBySku = {};
  const cmvByProd = {};
  for (let r=1;r<cmvVals.length;r++){
    const sku = cSku>=0 ? String(cmvVals[r][cSku]||'').trim() : '';
    const prod= cProd>=0 ? String(cmvVals[r][cProd]||'').trim() : '';
    const tipo= cTipo>=0 ? String(cmvVals[r][cTipo]||'').trim() : '';
    const cmv = cCmv>=0 ? _parseNumBR(cmvVals[r][cCmv]) : null;
    if (sku) cmvBySku[_norm(sku)] = { produto: prod, tipo: tipo, cmv: cmv };
    if (prod) cmvByProd[_norm(prod)] = { sku: sku, tipo: tipo, cmv: cmv };
  }

  let matched=0, unmatched=0;
  itens[0] = headI;

  function cleanDesc(s){
    return _norm(String(s||'').replace(/^Venda online de peças de vestuário\s*-\s*/i,''));
  }

  for (let r=1;r<itens.length;r++){
    const row  = itens[r];
    const pedido = String(row[iPedido]||'').trim();
    const dt   = iData>=0 ? _parseDateStrict(row[iData]) : null;
    const prod = String(row[iProd]||'').trim();
    const qtd  = _parseNumBR(row[iQtd]) || 0;

    if (!pedido || !prod){
      unmatched++;
      continue;
    }

    const cands = byOrder[pedido] || [];
    const nProd = _norm(prod);
    let pick = null;

    for (let i=0;i<cands.length;i++){
      const c = cands[i];
      if (c.used) continue;
      const d = cleanDesc(c.prod);
      if (d === nProd || d.indexOf(nProd) >= 0 || nProd.indexOf(d) >= 0){
        pick = c;
        break;
      }
    }
    if (!pick){
      for (let i=0;i<cands.length;i++){
        if (!cands[i].used){ pick = cands[i]; break; }
      }
    }
    if (pick) pick.used = true;

    const sku = pick && pick.sku ? String(pick.sku).trim() : String(row[iSkuCol]||'').trim();
    const skuInfo = sku ? cmvBySku[_norm(sku)] : null;
    const prodInfo = cmvByProd[_norm(prod)] || null;

    const tipo = _detectTypeFromFeedOrTitle_(prod, pick ? pick.prod : '', skuInfo ? skuInfo.tipo : '', skuInfo ? skuInfo.produto : '', sku);
    let cmvUnit = _resolveCMVByDateAndKey_(dt, tipo, sku, prod);
    if (cmvUnit == null && skuInfo && skuInfo.cmv != null) cmvUnit = skuInfo.cmv;
    if (cmvUnit == null && prodInfo && prodInfo.cmv != null) cmvUnit = prodInfo.cmv;

    row[iSkuCol] = sku || '';
    row[iTipoCol] = tipo || '';
    row[iCmvUnitCol] = cmvUnit == null ? '' : cmvUnit;
    row[iCmvTotCol]  = cmvUnit == null ? '' : cmvUnit * qtd;

    if (cmvUnit == null) unmatched++; else matched++;
  }

  shItens.clearContents();
  shItens.getRange(1,1,itens.length,headI.length).setValues(itens);
  _fmtCurrencyRange(shItens,iCmvUnitCol+1,itens.length-1);
  _fmtCurrencyRange(shItens,iCmvTotCol+1,itens.length-1);

  SpreadsheetApp.getActive().toast(`CMV calculado em ${matched} linhas; ${unmatched} sem match.`, 'CMV', 8);
}
/************ RESUMO DIÁRIO ************/
function gerarResumoOMD(){
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const shMeta  = ss.getSheetByName('Meta_RAW');
  const shItens = ss.getSheetByName('Ink_Pedido_Itens');
  if (!shMeta || !shItens) throw new Error('Preciso de Meta_RAW e Ink_Pedido_Itens.');

  const metaVals  = shMeta.getDataRange().getValues();
  const itensVals = shItens.getDataRange().getValues();
  if (metaVals.length < 2 && itensVals.length < 2) return;

  const headerM = metaVals[0].map(v => String(v||''));
  const mapMeta = mapColumnsByAliasesAllowMissing_(headerM, META_ALIASES);
  const nM = headerM.map(_norm);
  const nI = itensVals[0].map(_norm);

  const f = (arr,rx) => {
    for (let i=0;i<arr.length;i++) if (rx.test(arr[i])) return i;
    return -1;
  };

  const mData = mapMeta['Data']  >= 0 ? mapMeta['Data']  : f(nM,/(^|\b)(data|dia|date|day|inicio|start)/);
  const mGasto= mapMeta['Gasto'] >= 0 ? mapMeta['Gasto'] : f(nM,/(amount spent|valor gasto|valor usado|gasto|spent)/);
  const mImp  = f(nM,/impress/);
  const mClk  = f(nM,/(cliques no link|link click|click)/);
  const mComp = f(nM,/(compras|purchase)/);

  const iData = f(nI,/(^|\b)(data|date|day)(\b|$)/);
  const iQtd  = f(nI,/(quantidade|qtd|qty)/);
  const iVal  = f(nI,/(valor bruto|preco|preç|price|valor)/);
  const iCmvT = f(nI,/cmv_total|cmv total|cmv_total|cmv/);

  const agg = {};
  const key = v => {
    const d = _parseDateStrict(v);
    if (!d) return null;
    if (ENFORCE_CUTOFF && d < CUTOFF_DATE) return null;
    return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  };

  const GASTO_MAX_ROW = 5000;
  if (mData >= 0 && mGasto >= 0){
    for (let r=1;r<metaVals.length;r++){
      const k = key(metaVals[r][mData]);
      if (!k) continue;

      let gasto = _parseNumBR(metaVals[r][mGasto]);
      if (gasto == null || !isFinite(gasto)) continue;
      if (gasto < 0 || gasto > GASTO_MAX_ROW) continue;

      const a = agg[k] || (agg[k] = {
        date: _parseDateStrict(metaVals[r][mData]),
        gasto:0, imp:0, clk:0, comprasMeta:0, qtdReal:0, faturamento:0, cmv:0
      });

      a.gasto += gasto;
      if (mImp  >= 0) a.imp        += _parseNumBR(metaVals[r][mImp])  || 0;
      if (mClk  >= 0) a.clk        += _parseNumBR(metaVals[r][mClk])  || 0;
      if (mComp >= 0) a.comprasMeta+= _parseNumBR(metaVals[r][mComp]) || 0;
    }
  }

  if (iData >=0 && iQtd>=0 && iVal>=0){
    for (let r=1;r<itensVals.length;r++){
      const row = itensVals[r];
      const k = key(row[iData]);
      if (!k) continue;

      const a = agg[k] || (agg[k] = {
        date: _parseDateStrict(row[iData]),
        gasto:0, imp:0, clk:0, comprasMeta:0, qtdReal:0, faturamento:0, cmv:0
      });

      const qtd  = _parseNumBR(row[iQtd]) || 0;
      const val  = _parseNumBR(row[iVal]) || 0;
      const cmvT = iCmvT>=0 ? (_parseNumBR(row[iCmvT])||0) : 0;

      a.qtdReal     += qtd;
      a.faturamento += val;
      a.cmv         += cmvT;
    }
  }

  const header = [
    'Data','Gasto Ads','Impressões','Cliques',
    'Compras (Meta)','Peças vendidas reais','Faturamento bruto',
    'CMV','Margem bruta','Adcost por peça','Ticket médio',
    'ROAS bruto','ROAS líquido','CTR','CPC','CPM',
    'CVR Meta','CVR Real'
  ];

  const {sh} = _ensureSheet('Resumo_Diario', header);
  _wipeDataKeepFormatting(sh,2);
  sh.getRange(1,1,1,header.length).setValues([header]);
  sh.setFrozenRows(1);

  const out = [];
  Object.keys(agg).sort().forEach(k=>{
    const d = agg[k];
    const margem = d.faturamento - d.cmv;
    const adcost = d.qtdReal ? d.gasto / d.qtdReal : null;
    const ticket = d.qtdReal ? d.faturamento / d.qtdReal : null;
    const roasB  = d.gasto ? d.faturamento / d.gasto : null;
    const roasL  = d.gasto ? margem / d.gasto : null;
    const ctr    = d.imp   ? d.clk / d.imp : null;
    const cpc    = d.clk   ? d.gasto / d.clk : null;
    const cpm    = d.imp   ? d.gasto * 1000 / d.imp : null;
    const cvrM   = d.clk   ? d.comprasMeta / d.clk : null;
    const cvrR   = d.clk   ? d.qtdReal / d.clk : null;

    out.push([
      d.date,d.gasto||0,d.imp||0,d.clk||0,d.comprasMeta||0,d.qtdReal||0,
      d.faturamento||0,d.cmv||0,margem||0,adcost,ticket,roasB,roasL,
      ctr,cpc,cpm,cvrM,cvrR
    ]);
  });

  if (out.length){
    const rows = out.length;
    sh.getRange(2,1,rows,header.length).setValues(out);
    sh.getRange(2,1,rows,1).setNumberFormat('yyyy-MM-dd');
    [2,7,8,9,10,15,16].forEach(c=>_fmtCurrencyRange(sh,c,rows));
    [3,4,5].forEach(c=>_fmtIntRange(sh,c,rows));
    [14,17,18].forEach(c=>_fmtPctRange(sh,c,rows));
    sh.getRange(2,11,rows,3).setNumberFormat('0.00');
  }
}

function gerarContribuicaoDiaria(){
  const ss = SpreadsheetApp.getActive();
  const shResumo = ss.getSheetByName('Resumo_Diario');
  if (!shResumo) throw new Error('Aba Resumo_Diario necessária.');

  const vals = shResumo.getDataRange().getValues();
  if (vals.length < 2) return;

  const header = [
    'Data','Gasto Ads','Impressões','Cliques',
    'Compras (Meta)','Peças vendidas reais','Faturamento bruto',
    'CMV','Margem bruta','Lucro de contribuição','Margem de contribuição %',
    'Adcost por peça','Ticket médio','ROAS bruto','ROAS líquido','CTR','CPC','CPM',
    'CVR Meta','CVR Real'
  ];

  const {sh} = _ensureExactHeaders_('Contribuição Diária', header);
  _wipeDataKeepFormatting(sh,2);

  const out = [];
  for (let r=1;r<vals.length;r++){
    const row = vals[r];
    const dt = _parseDateStrict(row[0]);
    if (!dt) continue;

    const gasto = _parseNumBR(row[1]) || 0;
    const imp   = _parseNumBR(row[2]) || 0;
    const clk   = _parseNumBR(row[3]) || 0;
    const compM = _parseNumBR(row[4]) || 0;
    const qtd   = _parseNumBR(row[5]) || 0;
    const fat   = _parseNumBR(row[6]) || 0;
    const cmv   = _parseNumBR(row[7]) || 0;
    const margem= _parseNumBR(row[8]) || (fat - cmv);

    const lucroContrib = fat - cmv - gasto;
    const margemContribPct = fat ? (lucroContrib / fat) : null;
    const adcost = qtd ? gasto / qtd : null;
    const ticket = qtd ? fat / qtd : null;
    const roasB  = gasto ? fat / gasto : null;
    const roasL  = gasto ? margem / gasto : null;
    const ctr    = imp ? clk / imp : null;
    const cpc    = clk ? gasto / clk : null;
    const cpm    = imp ? gasto * 1000 / imp : null;
    const cvrM   = clk ? compM / clk : null;
    const cvrR   = clk ? qtd / clk : null;

    out.push([
      dt,gasto,imp,clk,compM,qtd,fat,cmv,margem,lucroContrib,margemContribPct,
      adcost,ticket,roasB,roasL,ctr,cpc,cpm,cvrM,cvrR
    ]);
  }

  if (out.length){
    sh.getRange(2,1,out.length,header.length).setValues(out);
    sh.getRange(2,1,out.length,1).setNumberFormat('yyyy-MM-dd');
    [2,7,8,9,10,12,13,17,18].forEach(c=>_fmtCurrencyRange(sh,c,out.length));
    [3,4,5,6].forEach(c=>_fmtIntRange(sh,c,out.length));
    [11,16,19,20].forEach(c=>_fmtPctRange(sh,c,out.length));
    sh.getRange(2,14,out.length,2).setNumberFormat('0.00');
  }
}

/************ AUDITORIA ************/
function gerarAuditoriaOMD(){
  const ss=SpreadsheetApp.getActive(), tz=ss.getSpreadsheetTimeZone();
  const shResumo=ss.getSheetByName('Resumo_Diario');
  const shMeta=ss.getSheetByName('Meta_RAW');
  const shItens=ss.getSheetByName('Ink_Pedido_Itens');
  if(!shResumo||!shMeta||!shItens) throw new Error('Preciso de Resumo_Diario, Meta_RAW e Ink_Pedido_Itens.');

  const resumoVals=shResumo.getDataRange().getValues();
  if(resumoVals.length<2) return;

  const metaVals=shMeta.getDataRange().getValues();
  const itensVals=shItens.getDataRange().getValues();
  if(metaVals.length<2 && itensVals.length<2) return;

  const headerMeta=metaVals[0].map(v=>String(v||''));
  const mapMeta=mapColumnsByAliasesAllowMissing_(headerMeta,META_ALIASES);
  const normMeta=headerMeta.map(_norm);
  const normItens=itensVals[0].map(_norm);

  const findIdx=(arr,regexes)=>{
    for(let i=0;i<arr.length;i++){
      for(const rg of regexes){
        if(rg.test(arr[i])) return i;
      }
    }
    return -1;
  };

  let mData = mapMeta['Data'];
  if (mData<0) mData=findIdx(normMeta,[/(^|\b)(data|dia|date|day)(\b|$)/,/start date/]);

  let mGasto = mapMeta['Gasto'];
  if (mGasto<0) mGasto=findIdx(normMeta,[/amount spent|valor gasto|valor usado|spent/]);

  const iData=findIdx(normItens,[/(^|\b)(data|date|day)(\b|$)/]);
  const iQtd=findIdx(normItens,[/quantidade|qtd|qty/]);
  const iVal=findIdx(normItens,[/valor bruto|preco|price|valor/]);

  const metaAgg={}, inkAgg={};
  const keyDate=v=>{
    const dt=_parseDateStrict(v);
    if(!dt) return null;
    if(ENFORCE_CUTOFF && dt<CUTOFF_DATE) return null;
    return Utilities.formatDate(dt,tz,'yyyy-MM-dd');
  };

  if(mData>=0 && mGasto>=0){
    for(let r=1;r<metaVals.length;r++){
      const row=metaVals[r];
      const k=keyDate(row[mData]);
      if(!k) continue;
      if(!metaAgg[k]) metaAgg[k]={gasto:0};
      metaAgg[k].gasto+=_parseNumBR(row[mGasto])||0;
    }
  }

  if(iData>=0 && iQtd>=0 && iVal>=0){
    for(let r=1;r<itensVals.length;r++){
      const row=itensVals[r];
      const k=keyDate(row[iData]);
      if(!k) continue;
      if(!inkAgg[k]) inkAgg[k]={qtd:0,fat:0};
      inkAgg[k].qtd+=_parseNumBR(row[iQtd])||0;
      inkAgg[k].fat+=_parseNumBR(row[iVal])||0;
    }
  }

  const header=[
    'Data','Gasto resumo','Gasto Meta','Dif Gasto',
    'Peças resumo','Peças Ink','Dif Peças',
    'Fat resumo','Fat Ink','Dif Fat'
  ];
  const {sh}=_ensureSheet('Auditoria', header);
  _wipeDataKeepFormatting(sh,2);
  const out=[header];

  for(let r=1;r<resumoVals.length;r++){
    const rowR=resumoVals[r];
    const dt=_parseDateStrict(rowR[0]);
    if(!dt) continue;

    const k=keyDate(dt);
    const meta=metaAgg[k]||{gasto:0};
    const ink=inkAgg[k]||{qtd:0,fat:0};
    const gastoResumo=rowR[1]||0;
    const pecasResumo=rowR[5]||0;
    const fatResumo=rowR[6]||0;

    out.push([
      dt,
      gastoResumo,
      meta.gasto,
      meta.gasto-gastoResumo,
      pecasResumo,
      ink.qtd,
      ink.qtd-pecasResumo,
      fatResumo,
      ink.fat,
      ink.fat-fatResumo
    ]);
  }

  if (out.length>1){
    sh.getRange(1,1,out.length,header.length).setValues(out);
    const rows=out.length-1;
    sh.getRange(2,1,rows,1).setNumberFormat('yyyy-MM-dd');
    _fmtIntRange(sh,5,rows);
    _fmtIntRange(sh,6,rows);
    _fmtIntRange(sh,7,rows);
    [2,3,4,8,9,10].forEach(c=>_fmtCurrencyRange(sh,c,rows));
  }
}

/************ RESUMO SEMANAL / MENSAL ************/
function gerarResumoPeriodos(){
  const ss=SpreadsheetApp.getActive(), tz=ss.getSpreadsheetTimeZone();
  const sh=ss.getSheetByName('Resumo_Diario');
  if(!sh) throw new Error('Aba Resumo_Diario necessária.');

  const v=sh.getDataRange().getValues();
  if(v.length<2) return;

  const idx={
    data:0, gasto:1, imp:2, clk:3,
    compM:4, qtd:5, fat:6, cmv:7, margem:8
  };

  const rows=v.slice(1).filter(r=>r[idx.data] instanceof Date);
  const semana={}, mes={};

  const n=x=>{
    const y=_parseNumBR(x);
    return y==null?0:y;
  };

  const kS=dt=>`${dt.getFullYear()}-S${Utilities.formatDate(dt,tz,"w")}`;
  const kM=dt=>`${dt.getFullYear()}-${Utilities.formatDate(dt,tz,"MM")}`;

  function add(obj,key,r){
    if(!obj[key]) obj[key]={g:0,i:0,c:0,m:0,q:0,f:0,cmv:0,mar:0};
    const o=obj[key];
    o.g+=n(r[idx.gasto]);
    o.i+=n(r[idx.imp]);
    o.c+=n(r[idx.clk]);
    o.m+=n(r[idx.compM]);
    o.q+=n(r[idx.qtd]);
    o.f+=n(r[idx.fat]);
    o.cmv+=n(r[idx.cmv]);
    o.mar+=n(r[idx.margem]);
  }

  rows.forEach(r=>{
    const dt=r[idx.data];
    add(semana,kS(dt),r);
    add(mes,kM(dt),r);
  });

  const header=[
    'Período','Gasto Ads','Impressões','Cliques',
    'Compras (Meta)','Peças reais','Faturamento bruto',
    'CMV','Margem bruta','Adcost','Ticket',
    'ROAS bruto','ROAS líquido','CTR','CPC','CPM',
    'CVR Meta','CVR Real'
  ];

  function pack(obj){
    const out=[header];
    Object.keys(obj).sort().forEach(k=>{
      const d=obj[k];
      const adcost=d.q?d.g/d.q:null;
      const ticket=d.q?d.f/d.q:null;
      const roasB=d.g?d.f/d.g:null;
      const roasL=d.g?d.mar/d.g:null;
      const ctr=d.i?d.c/d.i:null;
      const cpc=d.c?d.g/d.c:null;
      const cpm=d.i?d.g*1000/d.i:null;
      const cvrM=d.c?d.m/d.c:null;
      const cvrR=d.c?d.q/d.c:null;
      out.push([
        k,d.g,d.i,d.c,d.m,d.q,d.f,d.cmv,d.mar,
        adcost,ticket,roasB,roasL,ctr,cpc,cpm,cvrM,cvrR
      ]);
    });
    return out;
  }

  const {sh:ws1}=_ensureSheet('Resumo_Semanal', header);
  _wipeDataKeepFormatting(ws1,2);
  ws1.getRange(1,1,1,header.length).setValues([header]);
  ws1.setFrozenRows(1);
  const sem=pack(semana);
  if(sem.length>1){
    const b=sem.slice(1);
    ws1.getRange(2,1,b.length,header.length).setValues(b);
    const rows=b.length;
    [2,7,8,9,10,15,16].forEach(c=>_fmtCurrencyRange(ws1,c,rows));
    [3,4,5].forEach(c=>_fmtIntRange(ws1,c,rows));
    [14,17,18].forEach(c=>ws1.getRange(2,c,rows,1).setNumberFormat('0.00%'));
  }

  const {sh:ws2}=_ensureSheet('Resumo_Mensal', header);
  _wipeDataKeepFormatting(ws2,2);
  ws2.getRange(1,1,1,header.length).setValues([header]);
  ws2.setFrozenRows(1);
  const men=pack(mes);
  if(men.length>1){
    const b=men.slice(1);
    ws2.getRange(2,1,b.length,header.length).setValues(b);
    const rows=b.length;
    [2,7,8,9,10,15,16].forEach(c=>_fmtCurrencyRange(ws2,c,rows));
    [3,4,5].forEach(c=>_fmtIntRange(ws2,c,rows));
    [14,17,18].forEach(c=>ws2.getRange(2,c,rows,1).setNumberFormat('0.00%'));
  }
}

/************ DASHBOARD (opcional) ************/
function gerarDashboardOMD(){
  const ss=SpreadsheetApp.getActive();
  const shName='Dashboard';
  let sh=ss.getSheetByName(shName)||ss.insertSheet(shName);

  sh.getCharts().forEach(ch=>sh.removeChart(ch));
  sh.clearContents();
  sh.getRange(1,1).setValue('Dashboard – Ads x Vendas')
    .setFontSize(18).setFontWeight('bold');
  sh.setRowHeights(1,1,40);

  const shSem=ss.getSheetByName('Resumo_Semanal');
  const shMes=ss.getSheetByName('Resumo_Mensal');
  if(!shSem||!shMes) throw new Error('Preciso de Resumo_Semanal e Resumo_Mensal.');

  const lastSem=shSem.getLastRow();
  const lastMes=shMes.getLastRow();
  if(lastSem<2||lastMes<2) throw new Error('Resumos vazios.');

  function lineChart(r,c,title,dom,series){
    const b=sh.newChart().asLineChart()
      .setPosition(r,c,0,0)
      .addRange(dom)
      .addRange(series)
      .setOption('title',title)
      .setOption('legend',{position:'bottom'});
    sh.insertChart(b.build());
  }

  function columnChart(r,c,title,dom,series){
    const b=sh.newChart().asColumnChart()
      .setPosition(r,c,0,0)
      .addRange(dom)
      .addRange(series)
      .setOption('title',title)
      .setOption('legend',{position:'bottom'});
    sh.insertChart(b.build());
  }

  const semPeriodo=shSem.getRange(1,1,lastSem,1);
  lineChart(3,1,'Adcost por semana', semPeriodo, shSem.getRange(1,10,lastSem,1));
  columnChart(20,1,'Peças por semana', semPeriodo, shSem.getRange(1,6,lastSem,1));
  columnChart(37,1,'Gasto Ads por semana', semPeriodo, shSem.getRange(1,2,lastSem,1));

  const mesPeriodo=shMes.getRange(1,1,lastMes,1);
  columnChart(3,7,'ROAS por mês', mesPeriodo, shMes.getRange(1,12,lastMes,1));
  lineChart(20,7,'Ticket por mês', mesPeriodo, shMes.getRange(1,11,lastMes,1));
}

/*** === CMV: atualização a partir do feed + vigências === ***/
function updateCMVProdutosFromFeed(){
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const f = _findLatestCsvInFolder(folder, /(facebook|store|ink|feed).*\.csv/i);
  if(!f) {
    SpreadsheetApp.getUi().alert('CSV do feed não encontrado na pasta do Drive.');
    return;
  }

  const csv = _readCsvSmart(f);
  if (!csv || csv.length < 2){
    SpreadsheetApp.getUi().alert('CSV do feed vazio ou inválido.');
    return;
  }

  const H = (csv[0]||[]).map(h => String(h||'').trim());
  const hN = H.map(_norm);

  const iTitle = _findHeaderIndex_(hN, ['title','produto','name','nome','item title']);
  const iSku   = _findHeaderIndex_(hN, ['id','sku','retailer id','retailer_id','item_group_id','variant id']);
  const iPrice = _findHeaderIndex_(hN, ['price','preco','preço']);
  const iSale  = _findHeaderIndex_(hN, ['sale_price','sale price','preco promocional','preço promocional','promotional price']);
  const iTipo  = _findHeaderIndex_(hN, ['custom_label_0','tipo','product type']);

  if(iTitle < 0){
    SpreadsheetApp.getUi().alert('Coluna de título não encontrada no feed.');
    return;
  }

  _ensureCMVVigenciasSheet_();
  const headers = ['Produto','CMV_Unit','SKU','Price','Sale_Price','Tipo'];
  const {sh} = _ensureExactHeaders_('CMV_Produtos', headers);

  const mapByTitle = new Map();
  let cmvMatched=0;

  for(let r=1;r<csv.length;r++){
    const row = csv[r];
    if(!row) continue;

    const title = String(row[iTitle]||'').trim();
    if(!title) continue;

    const sku   = iSku  >=0 ? String(row[iSku]||'').trim() : '';
    const price = iPrice>=0 ? _parseNumBR(row[iPrice]) : null;
    const sale  = iSale >=0 ? _parseNumBR(row[iSale])  : null;
    const tipo  = _detectTypeFromFeedOrTitle_(title, '', iTipo>=0 ? row[iTipo] : '', title, sku);
    const cmv   = _resolveCMVByDateAndKey_(new Date(), tipo, sku, title);

    const rec = [title, cmv == null ? '' : cmv, sku, price == null ? '' : price, sale == null ? '' : sale, tipo];
    if (cmv != null) cmvMatched++;
    mapByTitle.set(title, rec);
  }

  const out = Array.from(mapByTitle.values())
    .sort((a,b)=>String(a[0]||'').localeCompare(String(b[0]||'')));

  sh.clearContents();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if(out.length) sh.getRange(2,1,out.length,headers.length).setValues(out);

  _fmtCurrencyRange(sh,2,out.length);
  if (out.length) sh.getRange(2,4,out.length,2).setNumberFormat('R$ #,##0.00');

  SpreadsheetApp.getActive().toast(
    `CMV_Produtos atualizado de ${f.getName()} (${out.length} itens, ${cmvMatched} com CMV preenchido).`,
    'CMV OK',
    8
  );
}

function reprocessarCMV(){
  _ensureCMVVigenciasSheet_();
  updateCMVProdutosFromFeed();
  enrichInkItensWithSKUeCMV();
  gerarResumoOMD();
  gerarContribuicaoDiaria();
  gerarResumoPeriodos();
  gerarTop10Periodos();
  gerarAuditoriaOMD();
  SpreadsheetApp.getActive().toast('CMV reprocessado com sucesso.','OK',6);
}

/************ PIPELINE COMPLETO ************/
function importProcessAll(){
  importFromDriveAndNormalize();
  enrichInkItensWithSKUeCMV();
  gerarResumoOMD();
  gerarContribuicaoDiaria();
  gerarResumoPeriodos();
  gerarTop10Periodos();
  gerarAuditoriaOMD();
  SpreadsheetApp.getActive().toast('Pipeline completo incremental (2025 preservado, 2026+ atualizado).','OK',6);
}
