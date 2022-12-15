import express from 'express'
import * as db from './db.js'
import * as connection from './connection.js'
import { assert, object, number, string, type, enums, optional } from 'superstruct'
import path from 'path'
import { CONNECTION_TYPES } from './constants.js'

const app = express()
const port = process.env.PORT ?? 5040

app.use(express.json())
app.use(express.static('public'))

// URL rewriting for vue router web history mode
app.use((req, res, next) => {
    if(req.method === 'GET' && req.url.startsWith('/api') === false) {
        res.sendFile(path.resolve('./public/index.html'))
        return
    }
    next()
})

const apiRouter = express.Router()

apiRouter.get('/install', (_req, res) => {
    res.send(db.migrate())
})

apiRouter.get('/connections', (_req, res) => {
    try {
        const connections = db.getConnections()
        res.send(connections)
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

apiRouter.post('/connection', (req, res) => {
    try {
        const newConnectionStruct = object({
            name: string(),
            type: enums([CONNECTION_TYPES.POSTGRESQL, CONNECTION_TYPES.MYSQL]),
            host: string(),
            port: number(),
            username: string(),
            password: string(),
            database: string(),
            schema: optional(string())
        })

        assert(req.body, newConnectionStruct)

        if(req.body.type === CONNECTION_TYPES.MYSQL) {
            assert(req.body, type({
                schema: enums([null, undefined])
            }))
        }

        if(req.body.type === CONNECTION_TYPES.POSTGRESQL) {
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

apiRouter.get('/connection/:connection_id', async(req, res) => {
    let details = null

    try {
        details = db.getConnection(req.params.connection_id)
    } catch(e) {
        res.status(400).send(e.message)
        return
    }

    try {
        const tables = await connection.getTables(req.params.connection_id)
        res.send({
            details,
            tables: {
                success: true,
                data: tables
            }
        })
    } catch(e) {
        res.send({
            details,
            tables: {
                success: false,
                data: e.message === 'write CONNECT_TIMEOUT undefined:undefined' ? 'Unable to establish connection with database' : e.message
            }
        })
    }
})

apiRouter.delete('/connection/:connection_id', async(req, res) => {
    try {
        db.deleteConnection(req.params.connection_id)
        res.send('Connection deleted')
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

apiRouter.get('/connection/:connection_id/:table_name', async(req, res) => {
    try {
        const tableDetails = await connection.getTableDetails(req.params.connection_id, req.params.table_name)
        res.send(tableDetails)
    } catch(e) {
        res.status(400).send(e.message)
    }
})

apiRouter.post('/connection/:connection_id/query', async(req, res) => {
    try {
        const result = await connection.runQuery(req.params.connection_id, req.body.query)
        res.send(result)
    } catch(e) {
        res.status(400).send(e.message)
    }
})

app.use('/api', apiRouter)

app.listen(port, () => {
    console.log(`App listening on port http://localhost:${port}`)
})
