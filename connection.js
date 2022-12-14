import * as db from './db.js'
import postgres from 'postgres'

export async function getTables(connectionId) {
    try {
        const connection = db.getConnection(connectionId)
        const sql = postgres(connection.connection_url)
        const rows = await sql`
            SELECT
                table_name
            FROM
                information_schema.tables
            WHERE
                table_schema = ${connection.schema}
        `
        return rows
    } catch(e) {
        console.error(e)
        return e.message
    }
}

export async function getColumns(connectionId, tableName) {
    try {
        const connection = db.getConnection(connectionId)
        const sql = postgres(connection.connection_url)
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
        return e.message
    }
}

export async function runQuery(connectionId, query) {
    try {
        const connection = db.getConnection(connectionId)
        const sql = postgres(connection.connection_url)
        const rows = await sql.unsafe(query)
        return rows
    } catch(e) {
        console.error(e)
        return e.message
    }
}
