import * as db from './db.js'
import postgres from 'postgres'

let connectionCache = {}

function getPostgresConnection(connectionId) {
    if(connectionId in connectionCache === false) {
        const connection = db.getConnection(connectionId)
        const sql = postgres(connection.connection_url, {
            connect_timeout: 5
        })

        connectionCache[connectionId] = {
            connection,
            sql
        }
    }

    return connectionCache[connectionId]
}

export async function getTables(connectionId) {
    try {
        const { connection, sql } = getPostgresConnection(connectionId)
        const rows = await sql`
            SELECT
                table_name
            FROM
                information_schema.tables
            WHERE
                table_schema = ${connection.schema}
            ORDER BY table_name
        `
        return rows
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}

export async function getColumns(connectionId, tableName) {
    try {
        const { connection, sql } = getPostgresConnection(connectionId)
        const rows = await sql`
            SELECT
                column_name,
                data_type
            FROM
                information_schema.columns
            WHERE
                table_schema = ${connection.schema} AND table_name = ${tableName}
        `
        return rows
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}

export async function runQuery(connectionId, query) {
    try {
        const { connection, sql } = getPostgresConnection(connectionId)
        const rows = await sql.unsafe(query)
        return rows
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}
