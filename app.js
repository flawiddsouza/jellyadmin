import express from 'express'
import * as db from './db.js'
import * as connection from './connection.js'
import { assert, object, number, string, type, enums, optional, never } from 'superstruct'

const app = express()
const port = process.env.PORT ?? 5040

app.use(express.json())

app.get('/', (_req, res) => {
    res.send('Hello World!')
})

app.get('/install', (_req, res) => {
    res.send(db.migrate())
})

app.get('/connections', (_req, res) => {
    try {
        const connections = db.getConnections()
        res.send(connections)
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

app.post('/connection', (req, res) => {
    try {
        const newConnectionStruct = object({
            name: string(),
            type: enums(['postgresql', 'mysql']),
            host: string(),
            port: number(),
            username: string(),
            password: string(),
            database: string(),
            schema: optional(string())
        })

        assert(req.body, newConnectionStruct)

        if(req.body.type === 'mysql') {
            assert(req.body, type({
                schema: never()
            }))
        }

        if(req.body.type === 'postgresql') {
            assert(req.body, type({
                schema: string()
            }))
        }

        const createdConnection = db.addConnection(req.body.name, req.body.type, req.body.host, req.body.port, req.body.username, req.body.password, req.body.database, req.body.schema)

        res.status(201).send(createdConnection)
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

app.get('/connection/:connection_id', async(req, res) => {
    const tables = await connection.getTables(req.params.connection_id)
    res.send(tables)
})

app.delete('/connection/:connection_id', async(req, res) => {
    try {
        db.deleteConnection(req.params.connection_id)
        res.send('Connection deleted')
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

app.get('/connection/:connection_id/:table_name', async(req, res) => {
    const columns = await connection.getColumns(req.params.connection_id, req.params.table_name)
    res.send(columns)
})

app.post('/connection/:connection_id/query', async(req, res) => {
    const result = await connection.runQuery(req.params.connection_id, req.body.query)
    res.send(result)
})

app.listen(port, () => {
    console.log(`App listening on port http://localhost:${port}`)
})
