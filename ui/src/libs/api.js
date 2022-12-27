import { http } from './http.js'

export async function getConnections() {
    return http.get('/api/connections')
}

export async function addConnection(connection) {
    if(connection.type !== 'postgresql') {
        delete connection.schema
    }

    return http.post('/api/connection', connection)
}

export async function getConnection(connectionId, database, abortControllerSignal) {
    return http.get(`/api/connection/${connectionId}?database=${database}`, abortControllerSignal)
}

export async function getConnectionTable(connectionId, database, tableName) {
    return http.get(`/api/connection/${connectionId}/${tableName}?database=${database}`)
}

export async function runQuery(connectionId, database, query) {
    return http.post(`/api/connection/${connectionId}/query?database=${database}`, { query })
}

export async function updateConnection(connection) {
    const connectionid = connection.id

    delete connection.id
    delete connection.created_at

    if(connection.type !== 'postgresql') {
        delete connection.schema
    }

    return http.put(`/api/connection/${connectionid}`, connection)
}

export async function deleteConnection(connectionId) {
    return http.delete(`/api/connection/${connectionId}`)
}
