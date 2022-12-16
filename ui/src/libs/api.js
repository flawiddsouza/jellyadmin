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

export async function getConnection(connectionId) {
    return http.get(`/api/connection/${connectionId}`)
}

export async function getConnectionTable(connectionId, tableName) {
    return http.get(`/api/connection/${connectionId}/${tableName}`)
}

export async function runQuery(connectionId, query) {
    return http.post(`/api/connection/${connectionId}/query`, { query })
}

export async function deleteConnection(connectionId) {
    return http.delete(`/api/connection/${connectionId}`)
}
