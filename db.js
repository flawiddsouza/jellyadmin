import SQLite3 from 'better-sqlite3'

const db = new SQLite3('store.db')

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

    return 'Nothing to migrate'
}

export function getConnections() {
    return db.prepare('SELECT * FROM connections ORDER BY name').all()
}

export function addConnection(name, type, host, port, username, password, database, schema) {
    const result = db.prepare('INSERT INTO connections(name, type, host, port, username, password, database, schema) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(name, type, host, port, username, password, database, schema)
    return getConnection(result.lastInsertRowid)
}

export function getConnection(connectionId) {
    const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(connectionId)
    if(!connection) {
        throw new Error('Given connection id does not exist')
    }
    connection.connection_url = `${connection.type}://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`
    return connection
}

export function deleteConnection(connectionId) {
    const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(connectionId)
    if(!connection) {
        throw new Error('Given connection id does not exist')
    }
    return db.prepare('DELETE FROM connections WHERE id = ?').run(connectionId)
}
