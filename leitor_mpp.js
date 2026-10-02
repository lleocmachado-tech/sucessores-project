/* Leitor de arquivos .mpp (MS Project 2010–365, formato MPP14) que roda direto no navegador.
   Lê o contêiner OLE2, as tabelas de tarefas e os vínculos. Devolve o mesmo objeto que o painel usa.
   Este arquivo é embutido no HTML por atualizar_painel.py. */

/* ---------- contêiner OLE2 (Compound File Binary) ---------- */
function mppCFB(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const sig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
  if (u8.length < 512 || sig.some((b, i) => u8[i] !== b)) throw new Error('Este arquivo não é um .mpp do MS Project.');
  const ss = 1 << dv.getUint16(30, true), mss = 1 << dv.getUint16(32, true);
  const nFat = dv.getUint32(44, true), dirStart = dv.getUint32(48, true), cutoff = dv.getUint32(56, true);
  const miniStart = dv.getUint32(60, true), difStart = dv.getUint32(68, true), nDif = dv.getUint32(72, true);
  const END = 0xFFFFFFFA;
  const secDv = i => { if ((i + 2) * ss > u8.length) throw new Error('arquivo incompleto ou corrompido'); return new DataView(u8.buffer, u8.byteOffset + (i + 1) * ss, ss); };
  const difat = []; for (let i = 0; i < 109; i++) difat.push(dv.getUint32(76 + i * 4, true));
  for (let d = difStart, n = 0; n < nDif && d < END; n++) { const s = secDv(d); for (let i = 0; i < ss / 4 - 1; i++) difat.push(s.getUint32(i * 4, true)); d = s.getUint32(ss - 4, true); }
  const fat = []; difat.slice(0, nFat).forEach(f => { const s = secDv(f); for (let i = 0; i < ss / 4; i++) fat.push(s.getUint32(i * 4, true)); });
  const chain = (start, tbl) => { const o = [], seen = new Set(); let c = start; while (c < END && !seen.has(c)) { seen.add(c); o.push(c); c = tbl[c]; } return o; };
  const readChain = (start, size) => {
    const ch = chain(start, fat), out = new Uint8Array(ch.length * ss);
    ch.forEach((c, i) => out.set(u8.subarray((c + 1) * ss, (c + 2) * ss), i * ss));
    return size != null ? out.subarray(0, size) : out;
  };
  const dir = readChain(dirStart), ddv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength), ents = [];
  for (let o = 0; o + 128 <= dir.length; o += 128) {
    const nl = ddv.getUint16(o + 64, true); let name = '';
    for (let i = 0; i < nl / 2 - 1; i++) name += String.fromCharCode(ddv.getUint16(o + i * 2, true));
    ents.push({name, type: dir[o + 66], left: ddv.getUint32(o + 68, true), right: ddv.getUint32(o + 72, true), child: ddv.getUint32(o + 76, true), start: ddv.getUint32(o + 116, true), size: ddv.getUint32(o + 120, true)});
  }
  const root = ents[0], miniData = readChain(root.start, root.size), miniFat = [];
  chain(miniStart, fat).forEach(c => { const s = secDv(c); for (let i = 0; i < ss / 4; i++) miniFat.push(s.getUint32(i * 4, true)); });
  const readMini = (start, size) => { const ch = chain(start, miniFat), out = new Uint8Array(ch.length * mss); ch.forEach((c, i) => out.set(miniData.subarray(c * mss, (c + 1) * mss), i * mss)); return out.subarray(0, size); };
  const streams = {};
  const walk = (i, path) => {
    if (i === 0xFFFFFFFF || i >= ents.length) return;
    const e = ents[i]; walk(e.left, path);
    const p = path ? path + '/' + e.name : e.name;
    if (e.type === 2) streams[p] = e.size < cutoff ? readMini(e.start, e.size) : readChain(e.start, e.size); else if (e.type === 1) walk(e.child, p);
    walk(e.right, path);
  };
  walk(root.child, '');
  return streams;
}

/* ---------- blocos auxiliares ---------- */
const mppDV = b => new DataView(b.buffer, b.byteOffset, b.byteLength);
function mppProps(b) {                       // "Props14": cabeçalho de 16 bytes + (tamanho, chave, ?) + dados
  const map = new Map(); if (!b || b.length < 16) return map;
  const dv = mppDV(b), n = dv.getUint16(12, true); let o = 16;
  for (let i = 0; i < n && o + 12 <= b.length; i++) {
    const size = dv.getInt32(o, true), key = dv.getInt32(o + 4, true); o += 12;
    if (size < 1 || o + size > b.length) break;
    map.set(key, b.subarray(o, o + size)); o += size; if (size % 2) o++;
  }
  return map;
}
function mppVarMeta(b) {                     // uid -> (tipo -> deslocamento no Var2Data)
  const t = new Map(); if (!b || b.length < 24) return t;
  const dv = mppDV(b), n = dv.getInt32(8, true);
  for (let i = 0, o = 24; i < n && o + 12 <= b.length; i++, o += 12) {
    const uid = dv.getInt32(o, true); if (!t.has(uid)) t.set(uid, new Map()); t.get(uid).set(dv.getUint16(o + 8, true), dv.getInt32(o + 4, true));
  }
  return t;
}
function mppVar(t, data, uid, tipo) {
  const m = t.get(uid); if (!m || !m.has(tipo)) return null;
  const off = m.get(tipo), dv = mppDV(data); if (off < 0 || off + 4 > data.length) return null;
  const sz = dv.getInt32(off, true); return sz < 0 || off + 4 + sz > data.length ? null : data.subarray(off + 4, off + 4 + sz);
}
const mppStr = a => { let s = ''; for (let i = 0; i + 1 < a.length; i += 2) { const c = a[i] | (a[i + 1] << 8); if (!c) break; s += String.fromCharCode(c); } return s; };
function mppFixed(meta, data, isz) {         // registros de tamanho variável, endereçados pelo FixedMeta
  if (!meta || !data || meta.length < 16) return [];
  const m = mppDV(meta), n = Math.min(m.getUint32(8, true), Math.floor((meta.length - 16) / isz));
  const offs = []; for (let i = 0; i < n; i++) offs.push(m.getUint32(16 + i * isz + 4, true));
  const sorted = [...new Set(offs)].sort((a, b) => a - b);
  return offs.map(o => { if (o >= data.length) return null; const nx = sorted.find(x => x > o); return data.subarray(o, nx === undefined ? data.length : nx); });
}
const mppI32 = (d, o) => o >= 0 && o + 4 <= d.byteLength ? d.getInt32(o, true) : null;      // leituras que nunca estouram o registro
const mppI16 = (d, o) => o >= 0 && o + 2 <= d.byteLength ? d.getInt16(o, true) : null;
const MPP_EP = Date.UTC(1983, 11, 31) / 864e5;       // datas: dias desde 31/12/1983 + tempo em décimos de minuto
function mppDate(dv, o) {
  if (o < 0 || o + 4 > dv.byteLength) return null;
  const t = dv.getUint16(o, true), d = dv.getUint16(o + 2, true); if (!d || d === 0xFFFF) return null;
  return new Date((MPP_EP + d) * 864e5 + Math.round(t / 10) * 6e4).toISOString().slice(0, 10);
}
function mppSummaryInfo(b) {                 // título e revisão (propriedades OLE)
  const out = {}; if (!b || b.length < 48) return out;
  try {
    const dv = mppDV(b), sec = dv.getUint32(44, true), n = dv.getUint32(sec + 4, true);
    for (let i = 0; i < n; i++) {
      const pid = dv.getUint32(sec + 8 + i * 8, true), off = sec + dv.getUint32(sec + 12 + i * 8, true), vt = dv.getUint16(off, true);
      if (vt === 30) { const len = dv.getUint32(off + 4, true), s = new TextDecoder('windows-1252').decode(b.subarray(off + 8, off + 8 + len)).replace(/\0.*$/, ''); if (pid === 2) out.title = s; if (pid === 9) out.rev = s; }
      if (vt === 31) { const len = dv.getUint32(off + 4, true); let s = ''; for (let k = 0; k < len; k++) { const c = dv.getUint16(off + 8 + k * 2, true); if (!c) break; s += String.fromCharCode(c); } if (pid === 2) out.title = s; if (pid === 9) out.rev = s; }
      if (vt === 64 && pid === 13) { const lo = dv.getUint32(off + 4, true), hi = dv.getUint32(off + 8, true); out.saved = new Date(Number((BigInt(hi) * 4294967296n + BigInt(lo)) / 10000n) - 11644473600000).toISOString().slice(0, 10); }
    }
  } catch (e) { /* propriedades opcionais */ }
  return out;
}

/* ---------- leitura do projeto ---------- */
const mppEtapa = (nome, fn) => { try { return fn(); } catch (e) { e.message = nome + ': ' + e.message; throw e; } };
function parseMPP(buf, nome) {
  const st = mppEtapa('estrutura do arquivo', () => mppCFB(buf)), raiz = Object.keys(st).map(k => k.split('/')[0]).find(n => st[n + '/TBkndTask/VarMeta']);
  if (!raiz) throw new Error('Não encontrei as tarefas neste .mpp.');
  if (raiz.trim() !== '114') throw new Error('Este .mpp foi salvo por uma versão antiga do MS Project (formato ' + raiz.trim() + '). Abra-o no Project 2010 ou mais novo e salve de novo, ou exporte em XML.');
  const g = n => st[raiz + '/' + n], T = 'TBkndTask/', props = mppEtapa('propriedades', () => mppProps(g('Props')));

  // mapa de campos gravado no arquivo: código do campo -> deslocamento no registro fixo (bloco 0)
  const off = {}, off1 = {};
  const fm = props.get(131092) || props.get(50331668);
  if (fm) { const dv = mppDV(fm); let prev = 0, blk = 0;
    for (let o = 0; o + 28 <= fm.length; o += 28) {
      const of = dv.getUint16(o + 4, true), code = dv.getInt32(o + 12, true) & 0xFFFF, loc = dv.getUint16(o + 20, true);
      if (loc === 11 || loc === 100 || of === 65535) continue;
      if (of < prev) blk++; prev = of; if (blk === 0 && !(code in off)) off[code] = of; if (blk === 1 && !(code in off1)) off1[code] = of;
    } }
  const O = (code, padrao) => off[code] !== undefined ? off[code] : padrao, O2 = (code, padrao) => off1[code] !== undefined ? off1[code] : padrao;
  const oId = O(23, 0), oUid = O(86, 4), oPct = O(32, 92), oIni = O(37, 104), oFim = O(38, 108), oIni2 = O2(1283, 50), oFim2 = O2(1284, 54), oAi = O(41, 120), oAf = O(42, 124), oNiv = O(249, 172);

  const mpd = (() => { const v = props.get(37748765); return v && v.length === 4 ? (mppDV(v).getInt32(0, true) || 480) : 480; })();
  const vt = mppEtapa('textos das tarefas', () => mppVarMeta(g(T + 'VarMeta'))), vd = g(T + 'Var2Data') || new Uint8Array(0);
  const F = mppEtapa('tabela de tarefas', () => mppFixed(g(T + 'FixedMeta'), g(T + 'FixedData'), 47));
  const m2 = g(T + 'Fixed2Meta'), d2 = g(T + 'Fixed2Data'); let F2 = [];
  if (m2 && d2 && m2.length > 16) { const n2 = mppDV(m2).getUint32(8, true); F2 = mppFixed(m2, d2, Math.floor((m2.length - 16) / Math.max(1, n2))); }
  const lista = [];
  let ruins = 0;
  F.forEach((r, ix) => {
    if (!r || r.length < 8) return;
    try {
      const d = mppDV(r), uid = mppI32(d, oUid), id = mppI32(d, oId);
      if (uid === null || id === null || uid <= 0 || id <= 0) return;            // 0 = resumo do projeto; negativos = marcadores internos
      const r2d = F2[ix] ? mppDV(F2[ix]) : new DataView(new ArrayBuffer(0));        // início/término "de verdade" ficam no Fixed2Data; sem ele vale o início/término mais cedo
      const nm = mppVar(vt, vd, uid, 14), n = nm ? mppStr(nm).trim() : '';
      const bs = mppVar(vt, vd, uid, 43), bf = mppVar(vt, vd, uid, 44), pc = mppI16(d, oPct);
      const t = {uid, id, ol: mppI16(d, oNiv) || 1, n, s: mppDate(r2d, oIni2) || mppDate(d, oIni), f: mppDate(r2d, oFim2) || mppDate(d, oFim), asS: mppDate(d, oAi), asF: mppDate(d, oAf),
        lbS: bs && bs.length >= 4 ? mppDate(mppDV(bs), 0) : null, lbF: bf && bf.length >= 4 ? mppDate(mppDV(bf), 0) : null, pc: Math.min(100, Math.max(0, pc || 0)) / 100};
      if (!n && !t.s) return;                                                     // linha em branco
      lista.push(t);
    } catch (e) { ruins++; }
  });
  if (!lista.length) throw new Error('Não consegui ler as tarefas deste arquivo' + (ruins ? ' (' + ruins + ' registros inválidos)' : '') + '. Se ele abre normalmente no MS Project, exporte em XML (Arquivo › Salvar como › XML) e carregue o .xml.');
  lista.sort((a, b) => a.id - b.id);

  // hierarquia: pai pelo nível de tópicos, resumo = tem filho, EDT numerada pela posição
  const pilha = [], cont = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], wbs = [];
  lista.forEach((t, i) => {
    const ol = Math.max(1, t.ol); t.ol = ol; pilha.length = ol; t.par = ol > 1 ? (pilha[ol - 1] ?? null) : null; pilha[ol] = t.uid;
    cont[ol]++; for (let k = ol + 1; k < cont.length; k++) cont[k] = 0; wbs.length = ol; wbs[ol] = cont[ol]; t.wbs = wbs.slice(1, ol + 1).join('.');
    t.sum = i + 1 < lista.length && Math.max(1, lista[i + 1].ol) > ol;
  });
  const tasks = {}; lista.forEach(t => { tasks[t.uid] = {id: t.id, wbs: t.wbs, ol: t.ol, par: t.par, n: t.n, sum: t.sum, lbS: t.lbS, lbF: t.lbF, asS: t.asS, asF: t.asF, s: t.s, f: t.f, pc: t.pc, su: [], pr: []}; });

  // vínculos: [id, predecessora, sucessora, tipo(2), defasagem(4), formato(2)]
  const cm = g('TBkndCons/FixedMeta'), cd = g('TBkndCons/FixedData'), tipo = ['FF', 'FS', 'SF', 'SS'];
  if (cm && cd) mppEtapa('vínculos', () => mppFixed(cm, cd, 10)).forEach(r => {
    if (!r || r.length < 20) return;
    const d = mppDV(r), a = mppI32(d, 4), b = mppI32(d, 8), ty = mppI16(d, 12), lag = mppI32(d, 14), fmt = mppI16(d, 18);
    if (a === null || b === null || !tasks[a] || !tasks[b]) return;
    const dias = Math.round((lag || 0) / 10 / ([4, 6, 8, 10, 12].includes(fmt) ? 1440 : mpd) * 100) / 100;   // formatos "decorridos" usam 24h
    tasks[b].pr.push([a, tipo[ty] || 'FS', dias]); tasks[a].su.push([b, tipo[ty] || 'FS', dias]);
  });

  const si = mppSummaryInfo(st['\u0005SummaryInformation']), sd = props.get(37748805);
  return mppFinalizar(tasks, {projeto: (si.title || '').trim() || nome.replace(/\.[^.]+$/, ''), revisao: si.rev || '', salvoEm: si.saved || null,
    dataStatus: sd && sd.length === 4 ? mppDate(mppDV(sd), 0) : null}, nome);
}

/* ---------- objeto final (comum a .mpp e .xml) ---------- */
function mppFinalizar(tasks, meta, nome) {
  if (!Object.keys(tasks).some(u => tasks[u].sum)) {                           // projeto "plano": cria a raiz virtual para o painel
    const ds = Object.values(tasks).flatMap(t => [t.s, t.f]).filter(Boolean).sort();
    Object.values(tasks).forEach(t => { t.par = -1; t.ol += 1; });
    tasks[-1] = {id: 0, wbs: '0', ol: 1, par: null, n: meta.projeto || 'Projeto', sum: true, lbS: null, lbF: null, asS: null, asF: null, s: ds[0] || null, f: ds[ds.length - 1] || null, pc: 0, su: [], pr: []};
  }
  const resumos = Object.keys(tasks).filter(u => tasks[u].sum);
  const pasta = resumos.find(u => tasks[u].n.trim() === 'Dependências') || resumos.find(u => tasks[u].ol === 1) || resumos[0];
  if (pasta === undefined) throw new Error('O arquivo não tem tarefas-resumo (EDT).');
  return {projeto: meta.projeto || 'Cronograma', arquivo: nome, pasta: +pasta, pastaNome: tasks[pasta].n, revisao: meta.revisao || '', salvoEm: meta.salvoEm || null,
    dataStatus: meta.dataStatus || null, geradoEm: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}), tasks};
}
if (typeof module !== 'undefined') module.exports = {parseMPP, mppFinalizar};
