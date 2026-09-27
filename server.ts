import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_PATH = path.join(DATA_DIR, 'catalog.json');
const TABLES_DIR = path.join(DATA_DIR, 'tables');
const PROV_NAMES_PATH = path.join(DATA_DIR, 'province_names.json');
const DOCS_DIR = path.join(DATA_DIR, 'docs');
const DATASETS_DIR = path.join(DATA_DIR, 'datasets');

// Load metadata catalog
let catalog: any = { databases: {}, topics: {}, tables: {}, previews: {} };
if (fs.existsSync(CATALOG_PATH)) {
  catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
}

// Load province names
let provinceNames: Record<string, string> = {};
if (fs.existsSync(PROV_NAMES_PATH)) {
  try {
    provinceNames = JSON.parse(fs.readFileSync(PROV_NAMES_PATH, 'utf-8'));
  } catch (e) {
    console.error('Error loading province names:', e);
  }
}

// Memory cache for table data
const tableCache = new Map<string, any>();
function loadTable(schema: string, table: string): any | null {
  const fileKey = `${schema}_${table}`;
  if (tableCache.has(fileKey)) {
    return tableCache.get(fileKey);
  }
  const filePath = path.join(TABLES_DIR, `${fileKey}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    tableCache.set(fileKey, data);
    return data;
  } catch (e) {
    console.error(`Error loading table ${schema}.${table}:`, e);
    return null;
  }
}

// Geo canonicalization for Peru departments
const CODE2NAME: Record<string, string> = {
  '01': 'Amazonas', '02': 'Ancash', '03': 'Apurimac', '04': 'Arequipa',
  '05': 'Ayacucho', '06': 'Cajamarca', '07': 'Callao', '08': 'Cusco',
  '09': 'Huancavelica', '10': 'Huanuco', '11': 'Ica', '12': 'Junin',
  '13': 'La Libertad', '14': 'Lambayeque', '15': 'Lima', '16': 'Loreto',
  '17': 'Madre de Dios', '18': 'Moquegua', '19': 'Pasco', '20': 'Piura',
  '21': 'Puno', '22': 'San Martin', '23': 'Tacna', '24': 'Tumbes',
  '25': 'Ucayali',
};

function stripNorm(s: any): string {
  return String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const NORM2NAME: Record<string, string> = {};
for (const v of Object.values(CODE2NAME)) {
  NORM2NAME[stripNorm(v)] = v;
}
NORM2NAME['PROV CONST DEL CALLAO'] = 'Callao';
NORM2NAME['PROVINCIA CONSTITUCIONAL DEL CALLAO'] = 'Callao';
NORM2NAME['LIMA METROPOLITANA'] = 'Lima';
NORM2NAME['LIMA PROVINCIAS'] = 'Lima';
NORM2NAME['LIMA REGION'] = 'Lima';

function canonicalDept(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !isNaN(value)) {
    const code = String(Math.floor(value)).padStart(2, '0');
    return CODE2NAME[code] || null;
  }
  const s = String(value).trim();
  if (/^\d+$/.test(s)) {
    const code = s.padStart(2, '0');
    return CODE2NAME[code] || null;
  }
  return NORM2NAME[stripNorm(s)] || null;
}

function provName(code: any, isUbi: boolean): string | null {
  if (code === null || code === undefined) return null;
  const s = String(code).split('.')[0].padStart(isUbi ? 6 : 4, '0').slice(0, 4);
  return provinceNames[s] || null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ------------------------------------------------------------- Catalog APIs
  app.get('/api/databases', (_req, res) => {
    const list = Object.entries(catalog.databases).map(([schema, db]: [string, any]) => ({
      schema,
      ...db,
      n_tables: Object.values(catalog.tables).filter((t: any) => t.schema === schema).length,
    }));
    res.json(list);
  });

  app.get('/api/databases/:schema', (req, res) => {
    const schema = req.params.schema;
    const dbInfo = catalog.databases[schema];
    if (!dbInfo) {
      return res.status(404).json({ error: 'database not found' });
    }
    const dbObj = {
      schema,
      ...dbInfo,
      n_tables: Object.values(catalog.tables).filter((t: any) => t.schema === schema).length,
    };
    const themesMap: Record<string, any> = {};
    for (const t of Object.values(catalog.tables) as any[]) {
      if (t.schema !== schema) continue;
      const k = t.theme_key;
      if (!themesMap[k]) {
        themesMap[k] = { theme_key: k, theme_label: t.theme_label, tables: [] };
      }
      themesMap[k].tables.push({
        table: t.table,
        title: t.title,
        n_rows: t.n_rows,
        n_cols: t.n_cols,
        columns: t.columns,
        mappable: t.mappable,
      });
    }
    const themes = Object.values(themesMap).sort((a: any, b: any) => b.tables.length - a.tables.length);
    for (const th of themes) {
      th.tables.sort((a: any, b: any) => a.title.localeCompare(b.title));
    }
    res.json({ database: dbObj, themes });
  });

  app.get('/api/index', (_req, res) => {
    const list = Object.values(catalog.tables).map((m: any) => ({
      schema: m.schema,
      table: m.table,
      title: m.title,
      section: catalog.databases[m.schema]?.title || m.schema,
      theme: m.theme_label,
      topic: m.topic_label,
      topic_key: m.topic_key,
      family: m.family,
      window: m.window,
      mappable: m.mappable,
      kinds: m.kinds,
      years: m.years,
    }));
    res.json(list);
  });

  app.get('/api/topics', (_req, res) => {
    const out: Record<string, any> = {};
    for (const [k, lbl] of Object.entries(catalog.topics)) {
      out[k] = { topic_key: k, topic_label: lbl, tables: [] };
    }
    const famBest: Record<string, any> = {};
    const allTables = (Object.values(catalog.tables) as any[])
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));

    for (const meta of allTables) {
      const sc = meta.schema;
      const t = meta.table;
      const entry: any = {
        schema: sc,
        table: t,
        title: meta.title,
        source: catalog.databases[sc]?.title,
        n_rows: meta.n_rows,
        family: meta.family,
        window: meta.window,
      };
      const tk = meta.topic_key || 'territorio';
      const fam = meta.family;
      if (fam) {
        const best = famBest[fam];
        if (!best) {
          entry.windows = [{ table: t, window: meta.window }];
          famBest[fam] = entry;
          if (out[tk]) out[tk].tables.push(entry);
        } else {
          best.windows.push({ table: t, window: meta.window });
          if ((meta.window || '') > (best.window || '')) {
            best.schema = sc;
            best.table = t;
            best.window = meta.window;
            best.title = meta.title;
          }
        }
      } else {
        if (out[tk]) out[tk].tables.push(entry);
      }
    }
    const resList = Object.values(out).filter((v: any) => v.tables.length > 0);
    for (const topic of resList) {
      for (const e of topic.tables) {
        if (e.windows) {
          e.windows.sort((a: any, b: any) => (a.window || '').localeCompare(b.window || ''));
          e.title = e.title.split(' (')[0];
        }
      }
    }
    res.json(resList);
  });

  app.get('/api/readme/:name', (req, res) => {
    const name = req.params.name;
    const docPath = path.join(DOCS_DIR, `${name}.md`);
    if (!fs.existsSync(docPath)) {
      return res.status(404).send('no readme for that database');
    }
    const content = fs.readFileSync(docPath, 'utf-8');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(content);
  });

  app.get('/api/previews/:schema', (req, res) => {
    const schema = req.params.schema;
    if (!catalog.databases[schema]) {
      return res.status(404).json({ error: 'database not found' });
    }
    res.json(catalog.previews[schema] || {});
  });

  app.get('/api/tables/:schema/:table', (req, res) => {
    const { schema, table } = req.params;
    const key = `${schema}.${table}`;
    const meta = catalog.tables[key];
    if (!meta) {
      return res.status(404).json({ error: 'table not found' });
    }
    const tableData = loadTable(schema, table);
    res.json({
      ...meta,
      column_types: tableData?.types || {},
      dept_col: meta.dept_col,
      geo_level: meta.geo_level,
      temporal_col: meta.temporal_col,
      category_col: meta.category_col,
      mappable: meta.mappable,
    });
  });

  app.get('/api/distinct/:schema/:table/:col', (req, res) => {
    const { schema, table, col } = req.params;
    const key = `${schema}.${table}`;
    const meta = catalog.tables[key];
    if (!meta) {
      return res.status(404).json({ error: 'table not found' });
    }
    const tableData = loadTable(schema, table);
    if (!tableData || !tableData.columns.includes(col)) {
      return res.status(400).json({ error: 'bad column' });
    }
    const counts = new Map<any, number>();
    for (const r of tableData.rows) {
      const v = r[col];
      if (v !== null && v !== undefined && v !== '') {
        counts.set(v, (counts.get(v) || 0) + 1);
      }
    }
    const values = Array.from(counts.keys());
    if (col === meta.category_col) {
      values.sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
    } else {
      values.sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b));
      });
    }
    res.json({ values: values.slice(0, 500) });
  });

  // ------------------------------------------------------------- Data APIs
  app.get('/api/data/:schema/:table', (req, res) => {
    const { schema, table } = req.params;
    const key = `${schema}.${table}`;
    const meta = catalog.tables[key];
    if (!meta) {
      return res.status(404).json({ error: `unknown table ${schema}.${table}` });
    }
    const tableData = loadTable(schema, table);
    if (!tableData) {
      return res.status(404).json({ error: 'table data not found' });
    }

    let filters: any[] = [];
    if (req.query.filters) {
      try {
        filters = JSON.parse(req.query.filters as string);
      } catch {
        return res.status(400).json({ error: 'filters must be valid JSON' });
      }
    }

    let rows = tableData.rows;
    if (filters.length > 0) {
      rows = rows.filter((r: any) => {
        for (const f of filters) {
          const { col, op = 'eq', val } = f;
          const v = r[col];
          if (op === 'eq' && v != val) return false;
          if (op === 'ne' && v == val) return false;
          if (op === 'gt' && !(v > val)) return false;
          if (op === 'ge' && !(v >= val)) return false;
          if (op === 'lt' && !(v < val)) return false;
          if (op === 'le' && !(v <= val)) return false;
          if (op === 'in' && Array.isArray(val) && !val.includes(v)) return false;
        }
        return true;
      });
    }
    const total = rows.length;

    const order = req.query.order as string;
    const desc = req.query.desc === 'true' || req.query.desc === true;
    if (order && tableData.columns.includes(order)) {
      rows = rows.slice().sort((a: any, b: any) => {
        const va = a[order];
        const vb = b[order];
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        const cmp = (typeof va === 'number' && typeof vb === 'number')
          ? (va - vb)
          : String(va).localeCompare(String(vb));
        return desc ? -cmp : cmp;
      });
    }

    const offset = parseInt((req.query.offset as string) || '0', 10) || 0;
    const limit = Math.max(1, Math.min(parseInt((req.query.limit as string) || '5000', 10) || 5000, 50000));
    rows = rows.slice(offset, offset + limit);

    const colsParam = req.query.cols as string;
    let selectedCols = tableData.columns;
    if (colsParam) {
      const requested = colsParam.split(',').map((c) => c.trim());
      const filtered = requested.filter((c) => tableData.columns.includes(c));
      if (filtered.length > 0) selectedCols = filtered;
    }

    const selectedRows = rows.map((r: any) => {
      const obj: any = {};
      for (const c of selectedCols) obj[c] = r[c];
      return obj;
    });

    const typesObj: Record<string, string> = {};
    for (const c of selectedCols) typesObj[c] = tableData.types[c] || 'VARCHAR';

    res.json({
      schema,
      table,
      columns: selectedCols,
      types: typesObj,
      rows: selectedRows,
      returned: selectedRows.length,
      total,
    });
  });

  app.get('/api/map/:schema/:table', (req, res) => {
    const { schema, table } = req.params;
    const valueCol = req.query.value_col as string;
    const key = `${schema}.${table}`;
    const meta = catalog.tables[key];
    if (!meta) {
      return res.status(404).json({ error: `unknown table ${schema}.${table}` });
    }
    const gk = meta.dept_col;
    if (!gk) {
      return res.status(404).json({ error: 'table has no geographic column' });
    }
    const tableData = loadTable(schema, table);
    if (!tableData || !tableData.columns.includes(valueCol)) {
      return res.status(404).json({ error: 'unknown value column' });
    }

    let filters: any[] = [];
    if (req.query.filters) {
      try {
        filters = JSON.parse(req.query.filters as string);
      } catch {
        return res.status(400).json({ error: 'filters must be valid JSON' });
      }
    }

    let rows = tableData.rows;
    if (filters.length > 0) {
      rows = rows.filter((r: any) => {
        for (const f of filters) {
          const { col, op = 'eq', val } = f;
          const v = r[col];
          if (op === 'eq' && v != val) return false;
          if (op === 'ne' && v == val) return false;
          if (op === 'gt' && !(v > val)) return false;
          if (op === 'ge' && !(v >= val)) return false;
          if (op === 'lt' && !(v < val)) return false;
          if (op === 'le' && !(v <= val)) return false;
          if (op === 'in' && Array.isArray(val) && !val.includes(v)) return false;
        }
        return true;
      });
    }

    const level = meta.geo_level;
    const isUbi = level === 'prov' && (gk.toLowerCase() === 'ubigeo');
    const agg: Record<string, number[]> = {};
    const unmatched = new Set<string>();

    for (const row of rows) {
      const raw = row[gk];
      let name: string | null = null;
      if (level === 'dept') {
        name = canonicalDept(raw);
      } else {
        name = provName(raw, isUbi);
      }
      if (!name) {
        if (raw !== null && raw !== undefined) unmatched.add(String(raw));
        continue;
      }
      let v = row[valueCol];
      if (typeof v === 'string') {
        const parsed = parseFloat(v);
        v = isNaN(parsed) ? null : parsed;
      }
      if (v === null || v === undefined || typeof v !== 'number') continue;
      if (!agg[name]) agg[name] = [];
      agg[name].push(v);
    }

    const data = Object.entries(agg).map(([name, vals]) => {
      const sum = vals.reduce((a, b) => a + b, 0);
      return { name, value: Number((sum / vals.length).toFixed(4)) };
    });
    const vals = data.map((d) => d.value);

    res.json({
      schema,
      table,
      value_col: valueCol,
      dept_col: gk,
      geo_level: level,
      data,
      n_matched: data.length,
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null,
      unmatched: Array.from(unmatched).sort(),
    });
  });

  app.get('/api/download/:schema/:table.csv', (req, res) => {
    const { schema, table } = req.params;
    const key = `${schema}.${table}`;
    const meta = catalog.tables[key];
    if (!meta) {
      return res.status(404).json({ error: 'unknown table' });
    }
    const srcFile = meta.source_file;
    const csvPath = path.join(DATASETS_DIR, srcFile);
    if (fs.existsSync(csvPath)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
      return fs.createReadStream(csvPath).pipe(res);
    }
    // Fallback: build from table data
    const tableData = loadTable(schema, table);
    if (!tableData) return res.status(404).send('table not found');
    const cols = tableData.columns;
    const lines = [cols.join(',')];
    for (const r of tableData.rows) {
      lines.push(cols.map((c: string) => JSON.stringify(r[c] ?? '')).join(','));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
    res.send(lines.join('\n'));
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      tables: Object.keys(catalog.tables).length,
      databases: Object.keys(catalog.databases),
    });
  });

  app.get('/sitemap.xml', (_req, res) => {
    const base = 'https://peruobservatorio.onrender.com';
    const fixed = [
      '', '/preguntas', '/tuvida', '/adivina', '/dibuja', '/dosperus',
      '/historia', '/desigualdad', '/quienvoto', '/graficos',
      '/movilidad', '/agenda', '/censos',
      '/comparar', '/correlacion', '/distrito', '/metodologia',
      '/datos', '/ensayos',
      ...['pobreza', 'ingreso', 'empleo', 'educacion', 'salud', 'sociedad', 'vivienda', 'agro', 'empresas', 'territorio'].map((k) => `/tema/${k}`),
    ];
    let urls = fixed.map((p) => `${base}${p}`);
    urls = urls.concat(Object.values(catalog.tables).map((t: any) => `${base}/db/${t.schema}/${t.table}`));
    const body = urls.map((u) => `<url><loc>${u}</loc></url>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  });

  app.get('/robots.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send('User-agent: *\nAllow: /\nSitemap: https://peruobservatorio.onrender.com/sitemap.xml\n');
  });

  // ----------------------------------------------------------- Vite / Frontend
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Observatorio listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
