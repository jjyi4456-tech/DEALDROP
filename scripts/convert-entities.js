import fs from 'fs';
import path from 'path';

const entitiesDir = path.resolve('base44/entities');
const outputSqlFile = path.resolve('supabase_schema.sql');

function jsoncParse(content) {
  // Simple comment stripper for jsonc
  const cleaned = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return JSON.parse(cleaned);
}

function mapType(propName, propDef) {
  if (propName === 'id') return 'UUID PRIMARY KEY DEFAULT gen_random_uuid()';
  
  const type = propDef.type;
  const format = propDef.format;

  if (type === 'string') {
    if (format === 'date') return 'DATE';
    if (format === 'date-time') return 'TIMESTAMPTZ';
    return 'TEXT';
  }
  if (type === 'number' || type === 'integer') {
    if (Number.isInteger(propDef.default)) return 'BIGINT';
    return 'NUMERIC';
  }
  if (type === 'boolean') {
    return 'BOOLEAN';
  }
  if (type === 'array' || type === 'object') {
    return 'JSONB';
  }
  return 'TEXT';
}

function formatDefault(val, pgType) {
  if (val === undefined || val === null) return '';
  if (pgType === 'BOOLEAN') return ` DEFAULT ${val}`;
  if (pgType === 'BIGINT' || pgType === 'NUMERIC') return ` DEFAULT ${val}`;
  if (pgType === 'JSONB') return ` DEFAULT '${JSON.stringify(val)}'::jsonb`;
  return ` DEFAULT '${val}'`;
}

function generateSQL() {
  const files = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.jsonc') || f.endsWith('.json'));
  let sql = `-- Migration generated automatically from Base44 Entities
-- Target: Supabase (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;

  for (const file of files) {
    const filePath = path.join(entitiesDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entity = jsoncParse(content);
      const tableName = (entity.name || path.basename(file, path.extname(file))).toLowerCase() + 's';
      const properties = entity.properties || {};
      const required = new Set(entity.required || []);

      sql += `-- -----------------------------------------------------\n`;
      sql += `-- Table: ${tableName} (from ${file})\n`;
      sql += `-- -----------------------------------------------------\n`;
      sql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
      sql += `    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
      sql += `    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,\n`;
      sql += `    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,\n`;
      sql += `    created_by_id TEXT,\n`;

      const colDefs = [];
      for (const [propName, propDef] of Object.entries(properties)) {
        if (propName === 'id' || propName === 'created_at' || propName === 'updated_at') continue;
        
        const pgType = mapType(propName, propDef);
        const defaultClause = formatDefault(propDef.default, pgType);
        const notNull = required.has(propName) && propDef.default === undefined ? ' NOT NULL' : '';
        
        colDefs.push(`    "${propName}" ${pgType}${defaultClause}${notNull}`);
      }

      sql += colDefs.join(',\n');
      sql += `\n);\n\n`;

      // Enable RLS
      sql += `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
      // Allow read to authenticated users by default (custom policies can be tuned)
      sql += `CREATE POLICY "Allow authenticated read" ON public.${tableName} FOR SELECT TO authenticated USING (true);\n`;
      sql += `CREATE POLICY "Allow public read" ON public.${tableName} FOR SELECT TO anon USING (true);\n`;
      sql += `CREATE POLICY "Allow all for authenticated users" ON public.${tableName} FOR ALL TO authenticated USING (true);\n\n`;
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  }

  fs.writeFileSync(outputSqlFile, sql, 'utf-8');
  console.log(`Successfully generated ${outputSqlFile}`);
}

generateSQL();
