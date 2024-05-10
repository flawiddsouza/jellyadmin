import SQLite3 from 'better-sqlite3'
import path from 'path'

const db = new SQLite3(path.resolve('store.db'))

db.pragma('journal_mode = WAL')

export function migrate() {
    const userVersion = db.prepare('PRAGMA user_version').pluck().get()

    if(userVersion === 0) {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS "connections" (
                id INTEGER,
                name TEXT,
                type TEXT,
                host TEXT,
                port INTEGER,
                username TEXT,
                password TEXT,
                database TEXT,
                schema TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(id)
            )
        `).run()

        db.prepare(`PRAGMA user_version = 1`).run()

        return 'Databased initialized'
    }

    if(userVersion === 1) {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS "saved_queries" (
                id INTEGER,
                connection_id INTEGER,
                name TEXT,
                query TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(id),
                FOREIGN KEY(connection_id) REFERENCES connections(id)
            )
        `).run()

        db.prepare(`PRAGMA user_version = 2`).run()

        return 'saved_queries table created'
    }

    return 'Nothing to migrate'
}

export function getConnections() {
    return db.prepare('SELECT * FROM connections ORDER BY name, database').all()
}

export function addConnection(name, type, host, port, username, password, database, schema) {
    const result = db.prepare('INSERT INTO connections(name, type, host, port, username, password, database, schema) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(name, type, host, port, username, password, database, schema)
    return getConnection(result.lastInsertRowid)
}

export function getConnection(connectionId, database) {
    const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(connectionId)
    if(!connection) {
        throw new Error('Given connection id does not exist')
    }
    connection.connection_url = `${connection.type}://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${database !== 'undefined' ? database : connection.database}`
    return connection
}

export function updateConnection(connectionId, name, type, host, port, username, password, database, schema) {
    db.prepare('UPDATE connections SET name=?, type=?, host=?, port=?, username=?, password=?, database=?, schema=?, updated_at=CURRENT_TIMESTAMP WHERE id = ?').run(name, type, host, port, username, password, database, schema, connectionId)
    return getConnection(connectionId)
}

export function deleteConnection(connectionId) {
    const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(connectionId)
    if(!connection) {
        throw new Error('Given connection id does not exist')
    }
    return db.prepare('DELETE FROM connections WHERE id = ?').run(connectionId)
}

export function getSavedQueries(connectionId) {
    return db.prepare('SELECT * FROM saved_queries WHERE connection_id = ? ORDER BY created_at DESC').all(connectionId)
}

export function addSavedQuery(name, query, connectionId) {
    const result = db.prepare('INSERT INTO saved_queries(name, query, connection_id) VALUES(?, ?, ?)').run(name, query, connectionId)
    return getSavedQuery(result.lastInsertRowid)
}

export function getSavedQuery(savedQueryId) {
    return db.prepare('SELECT * FROM saved_queries WHERE id = ?').get(savedQueryId)
}

export function deleteSavedQuery(savedQueryId) {
    return db.prepare('DELETE FROM saved_queries WHERE id = ?').run(savedQueryId)
}
