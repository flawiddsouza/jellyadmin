async function get(url) {
    const response = await fetch(url)
    const json = await response.json()
    return json
}

async function post(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })

    if(response.status !== 400) {
        const json = await response.json()
        return {
            success: true,
            data: json
        }
    } else {
        return {
            success: false,
            data: await response.text()
        }
    }
}

export async function getConnections() {
    return get('/api/connections')
}

export async function addConnection(connection) {
    return post('/api/connection', connection)
}

export async function getConnection(connectionId) {
    return get(`/api/connection/${connectionId}`)
}

export async function getConnectionTable(connectionId, tableName) {
    return get(`/api/connection/${connectionId}/${tableName}`)
}

export async function runQuery(connectionId, query) {
    return post(`/api/connection/${connectionId}/query`, { query })
}
