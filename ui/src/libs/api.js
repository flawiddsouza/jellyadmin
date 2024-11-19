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

export async function getCount(connectionId, database, tableName, hasWhere, query) {
    return http.post(`/api/connection/${connectionId}/count?database=${database}`, { tableName, hasWhere, query })
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

export async function getSavedQueries(connectionId) {
    return http.post(`/api/connection/${connectionId}/saved_queries`)
}

export async function addSavedQuery(connectionId, name, query) {
    return http.post(`/api/connection/${connectionId}/saved_query`, {
        name,
        query,
    })
}

export async function deleteSavedQuery(savedQueryId) {
    return http.delete(`/api/saved_query/${savedQueryId}`)
}

export async function importFile(connectionId, database, file) {
    const formData = new FormData()
    formData.append('database', database)
    formData.append('file', file)

    return http.postMultipart(`/api/connection/${connectionId}/import`, formData)
}
