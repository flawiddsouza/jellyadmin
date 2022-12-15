import * as db from './db.js'
import postgres from 'postgres'
import mysql from 'mysql2/promise'
import { CONNECTION_TYPES } from './constants.js'

let connectionCache = {}

async function getConnection(connectionId) {
    if(connectionId in connectionCache === false) {
        const connection = db.getConnection(connectionId)
        let sql = null

        if(connection.type === CONNECTION_TYPES.POSTGRESQL) {
            sql = postgres(connection.connection_url, {
                connect_timeout: 5
            })
        }

        if(connection.type === CONNECTION_TYPES.MYSQL) {
            sql = await mysql.createConnection(connection.connection_url)
        }

        connectionCache[connectionId] = {
            connection,
            sql
        }
    }

    return connectionCache[connectionId]
}

export async function getTables(connectionId) {
    try {
        const { connection, sql } = await getConnection(connectionId)

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
                    table_name as table_name
                FROM
                    information_schema.tables
                WHERE
                    table_schema = '${connection.database}'
                ORDER BY table_name
            `)
        }

        return rows
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}

export async function getColumns(connectionId, tableName) {
    try {
        const { connection, sql } = await getConnection(connectionId)


        let rows = []

        if(connection.type === CONNECTION_TYPES.POSTGRESQL) {
            rows = await sql`
                SELECT
                    column_name,
                    data_type
                FROM
                    information_schema.columns
                WHERE
                    table_schema = ${connection.schema} AND table_name = ${tableName}
            `
        }

        if(connection.type === CONNECTION_TYPES.MYSQL) {
            [ rows ] = await sql.execute(`
                SELECT
                    column_name as column_name,
                    data_type as data_type
                FROM
                    information_schema.columns
                WHERE
                    table_schema = '${connection.database}' AND table_name = '${tableName}'
                ORDER BY ordinal_position
            `)
        }

        return rows
    } catch(e) {
        console.error(e)
        throw new Error(e.message)
    }
}

export async function runQuery(connectionId, query) {
    try {
        const { connection, sql } = await getConnection(connectionId)

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
