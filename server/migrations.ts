import { db } from './db.js';
import { log } from './vite.js';
import { sql } from 'drizzle-orm';

// Detectar se estamos usando SQLite ou PostgreSQL
const isSQLite = process.env.DATABASE_URL?.startsWith('file:');

/**
 * Executa as migrações necessárias
 */
async function runMigrations() {
  console.log("Iniciando migrações...");
  let retries = 3;

  while (retries > 0) {
    try {
      console.log(`Tentando conectar ao banco de dados (tentativas restantes: ${retries})...`);
      // Teste de conexão simples com db
      await db.execute(sql`SELECT 1`);
      break;
    } catch (error) {
      console.error(`Erro ao conectar ao banco: ${error}`);
      retries--;
      if (retries > 0) {
        console.log("Aguardando 2 segundos antes da próxima tentativa...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }

  try {

    // Migração 1: Adicionar coluna website_url à tabela properties
    await addColumn('properties', 'website_url', 'text');
    
    // Migração 2: Adicionar colunas à projeção
    await addColumn('projections', 'imagem_imovel_url', 'text');
    await addColumn('projections', 'site_imovel_url', 'text');
    
    // Migração 3: Adicionar colunas ao calculo_projecoes
    await addColumn('calculo_projecoes', 'scenario', 'text', "'padrao'");
    await addColumn('calculo_projecoes', 'mes_da_venda', 'integer', '0');
    
    // Migração 4: Adicionar índice para scenario em calculo_projecoes
    await addIndex('calculo_projecoes', 'calculo_scenario_idx', 'scenario');
    
    // Migração 5: Renomear coluna username para email na tabela users
    await renameColumn('users', 'username', 'email');
    
    // Migração 6: Adicionar colunas created_at e updated_at à tabela users
    await addColumn('users', 'created_at', 'TIMESTAMP', 'NOW()');
    await addColumn('users', 'updated_at', 'TIMESTAMP', 'NOW()');
    
    // Migração 7: Adicionar colunas title e description à tabela public_report_links
    await addColumn('public_report_links', 'title', 'text');
    await addColumn('public_report_links', 'description', 'text');
    
    // Migração 8: Criar tabela selic_acumulada
    await createSelicAcumuladaTable();
    
    console.log("Migrações concluídas com sucesso!");
  } catch (err) {
    console.error("Erro ao executar migrações:", err);
  }
}

/**
 * Adiciona uma coluna a uma tabela se ela não existir
 */
async function addColumn(table: string, column: string, type: string, defaultValue?: string) {
  try {
    // Verificar se a coluna já existe
    let columnExists;
    if (isSQLite) {
      const result = await db.execute(sql`PRAGMA table_info(${sql.raw(table)})`);;
      columnExists = result.some((col: any) => col.name === column);
    } else {
      const result = await db.execute(
        sql`SELECT column_name FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = ${column}`
      );
      columnExists = result.length > 0;
    }
    
    if (!columnExists) {
      console.log(`Adicionando coluna ${column} à tabela ${table}...`);
      await db.execute(sql`ALTER TABLE ${sql.raw(table)} ADD COLUMN ${sql.raw(column)} ${sql.raw(type)}`);
      console.log(`✅ Coluna ${column} adicionada com sucesso!`);
    } else {
      console.log(`ℹ️ Coluna ${column} já existe na tabela ${table}`);
    }
  } catch (err) {
    console.error(`Erro ao adicionar coluna ${column} à tabela ${table}:`, err);
    throw err;
  }
}

/**
 * Adiciona um índice à tabela se ele não existir
 */
async function addIndex(table: string, indexName: string, column: string) {
  try {
    // Verificar se o índice já existe
    let indexExists;
    if (isSQLite) {
      const result = await db.execute(sql`SELECT name FROM sqlite_master WHERE type='index' AND name=${indexName}`);
      indexExists = result.length > 0;
    } else {
      const result = await db.execute(sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE indexname = ${indexName}
      `);
      indexExists = result.length > 0;
    }

    if (!indexExists) {
      console.log(`Criando índice ${indexName}...`);
      await db.execute(sql`CREATE INDEX ${sql.raw(indexName)} ON ${sql.raw(table)} (${sql.raw(column)})`);
      console.log(`✅ Índice ${indexName} criado com sucesso!`);
    } else {
      console.log(`ℹ️ Índice ${indexName} já existe`);
    }
  } catch (err) {
    console.error(`Erro ao adicionar índice ${indexName} à tabela ${table}:`, err);
    throw err;
  }
}

/**
 * Renomeia uma coluna se ela existir
 */
async function renameColumn(table: string, oldColumn: string, newColumn: string) {
  try {
    // Verificar se a coluna antiga existe
    let oldColumnExists;
    if (isSQLite) {
      const result = await db.execute(sql`PRAGMA table_info(${sql.raw(table)})`);;
      oldColumnExists = result.some((col: any) => col.name === oldColumn);
    } else {
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} AND column_name = ${oldColumn}
      `);
      oldColumnExists = result.length > 0;
    }

    if (oldColumnExists) {
      console.log(`Renomeando coluna ${oldColumn} para ${newColumn} na tabela ${table}...`);
      await db.execute(sql`ALTER TABLE ${sql.raw(table)} RENAME COLUMN ${sql.raw(oldColumn)} TO ${sql.raw(newColumn)}`);
      console.log(`✅ Coluna renomeada com sucesso!`);
    } else {
      console.log(`ℹ️ Coluna ${oldColumn} não existe na tabela ${table}`);
    }
  } catch (err) {
    console.error(`Erro ao renomear coluna ${oldColumn} para ${newColumn} na tabela ${table}:`, err);
    throw err;
  }
}

/**
 * Cria a tabela selic_acumulada se ela não existir
 */
async function createSelicAcumuladaTable() {
  try {
    // Verifica se a tabela já existe
    let tableExists;
    if (isSQLite) {
      const result = await db.execute(
        sql`SELECT name FROM sqlite_master WHERE type='table' AND name = 'selic_acumulada'`
      );
      tableExists = result.length > 0;
    } else {
      const result = await db.execute(
        sql`SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'selic_acumulada'`
      );
      tableExists = result.length > 0;
    }

    if (!tableExists) {
      if (isSQLite) {
        await db.execute(
          sql`CREATE TABLE selic_acumulada (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            index_type TEXT NOT NULL DEFAULT 'selic_acumulada',
            reference_date TEXT NOT NULL,
            value_annual DECIMAL(10,4) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )`
        );
      } else {
        await db.execute(
          sql`CREATE TABLE selic_acumulada (
            id SERIAL PRIMARY KEY,
            index_type TEXT NOT NULL DEFAULT 'selic_acumulada',
            reference_date TEXT NOT NULL,
            value_annual DECIMAL(10,4) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          )`
        );
      }
      console.log('Tabela selic_acumulada criada com sucesso');
    } else {
      console.log('Tabela selic_acumulada já existe');
    }
  } catch (err) {
    console.error('Erro ao criar tabela selic_acumulada:', err);
  }
}

export { runMigrations };