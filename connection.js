import * as db from './db.js'
import postgres from 'postgres'
import mysql from 'mysql2/promise'
import { CONNECTION_TYPES } from './constants.js'

let connectionCache = {}

async function getConnection(connectionId, database) {
    if(database === undefined) {
        throw new Error('database is a mandatory parameter for getConnection')
    }

    const key = `${connectionId}-${database}`

    if(key in connectionCache === false) {
        const connection = db.getConnection(connectionId, database)
        let sql = null

        if(connection.type === CONNECTION_TYPES.POSTGRESQL) {
            sql = postgres(connection.connection_url, {
                connect_timeout: 5,
                types: {
                    date: {
                        to: 1184,
                        from: [1082, 1083, 1114, 1184],
                        serialize: (date) => date,
                        parse: (date) => date
                    }
                }
            })
        }

        if(connection.type === CONNECTION_TYPES.MYSQL) {
            sql = await mysql.createConnection({
                host: connection.host,
                port: connection.port,
                user: connection.username,
                password: connection.password,
                database: database !== 'undefined' ? database : connection.database,
                dateStrings: true
            })
        }

        connectionCache[key] = {
            connection,
            sql
        }
    }

    return connectionCache[key]
}

export async function getDatabases(connectionId, database) {
    try {
        const { connection, sql } = await getConnection(connectionId, database)

        let rows = []

        if(connection.type === CONNECTION_TYPES.POSTGRESQL) {
            rows = await sql`
                SELECT datname as database FROM pg_database
                WHERE datistemplate = false
            `
        }

        if(connection.type === CONNECTION_TYPES.MYSQL) {
            [ rows ] = await sql.execute(`
                SHOW DATABASES
            `)

            rows = rows.map(row => ({
                database: row.Database
            }))
        }

        return rows
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}

export async function getTables(connectionId, database) {
    try {
        const { connection, sql } = await getConnection(connectionId, database)

        let rows = []

        if(connection.type === CONNECTION_TYPES.POSTGRESQL) {
            rows = await sql`
                SELECT
                    table_name
                FROM
                    information_schema.tables
                WHERE
                    table_schema = ${connection.schema}
                ORDER BY table_name
            `
        }

        if(connection.type === CONNECTION_TYPES.MYSQL) {
            [ rows ] = await sql.execute(`
                SELECT
                    TABLE_NAME as table_name
                FROM
                    information_schema.tables
                WHERE
                    table_schema = '${database}'
                ORDER BY table_name
            `)
        }

        return rows
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}

export async function getTableDetails(connectionId, database, tableName) {
    try {
        const { connection, sql } = await getConnection(connectionId, database)

        let columns = []
        let indexes = []
        let foreignKeys = []

        if(connection.type === CONNECTION_TYPES.POSTGRESQL) {
            columns = await sql`
                SELECT
                    column_name as name,
                    data_type as type,
                    CASE WHEN is_nullable = 'YES' THEN true ELSE false END as nullable,
                    column_default as default,
                    false as primary_column,
                    false as auto_increment,
                    pg_catalog.col_description(format('%s.%s', table_schema, table_name)::regclass::oid, ordinal_position) as comment
                FROM
                    information_schema.columns
                WHERE
                    table_schema = ${connection.schema} AND table_name = ${tableName}
                ORDER BY ordinal_position
            `

            indexes = await sql`
                SELECT
                    CASE WHEN starts_with(indexname, 'PK') THEN 'PRIMARY' WHEN starts_with(indexdef, 'CREATE UNIQUE') THEN 'UNIQUE' ELSE 'INDEX' END as type,
                    indexdef as column,
                    indexname as name
                FROM pg_indexes
                WHERE tablename = ${tableName};
            `

            foreignKeys = await sql`
                SELECT
                    tc.constraint_name as name,
                    kcu.column_name as column,
                    ccu.table_name AS foreign_table,
                    ccu.column_name AS foreign_column
                FROM
                    information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ${tableName};
            `
        }

        if(connection.type === CONNECTION_TYPES.MYSQL) {
            let result1 = await sql.execute(`
                SELECT
                    COLUMN_NAME as name,
                    COLUMN_TYPE as type,
                    CASE WHEN IS_NULLABLE = 'YES' THEN true ELSE false END as nullable,
                    COLUMN_DEFAULT as default_value,
                    CASE WHEN COLUMN_KEY = 'PRI' THEN true ELSE false END as primary_column,
                    CASE WHEN EXTRA = 'auto_increment' THEN true ELSE false END as auto_increment,
                    COLUMN_COMMENT as comment
                FROM
                    information_schema.columns
                WHERE
                    table_schema = '${database}' AND table_name = '${tableName}'
                ORDER BY ordinal_position
            `)

            columns = result1[0]

            let result2 = await sql.execute(`
                SHOW INDEX FROM \`${tableName}\`;
            `)

            indexes = result2[0].map(row => {
                let type = ''

                if(row.Key_name === 'PRIMARY') {
                    type = 'PRIMARY'
                } else {
                    if(row.Non_unique) {
                        type = 'INDEX'
                    } else {
                        type = 'UNIQUE'
                    }
                }

                return {
                    type,
                    column: row.Column_name,
                    name: row.Key_name
                }
            })

            let result3 = await sql.execute(`
                SELECT
                    CONSTRAINT_NAME as name,
                    COLUMN_NAME as 'column',
                    REFERENCED_TABLE_NAME as foreign_table,
                    REFERENCED_COLUMN_NAME as foreign_column
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE
                    TABLE_SCHEMA = "${database}" AND TABLE_NAME = "${tableName}" AND REFERENCED_COLUMN_NAME IS NOT NULL
            `)

            foreignKeys = result3[0]
        }

        return {
            columns,
            indexes,
            foreignKeys
        }
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}

export async function runQuery(connectionId, database, query) {
    try {
        const { connection, sql } = await getConnection(connectionId, database)

        let rows = []

        if(connection.type === CONNECTION_TYPES.POSTGRESQL) {
            rows = await sql.unsafe(query)
        }

        if(connection.type === CONNECTION_TYPES.MYSQL) {
            [ rows ] = await sql.execute(query)
        }

        return rows
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}
