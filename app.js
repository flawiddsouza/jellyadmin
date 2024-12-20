import express from 'express'
import * as db from './db.js'
import * as connection from './connection.js'
import { assert, object, number, string, type, enums, optional, nullable } from 'superstruct'
import path from 'path'
import { CONNECTION_TYPES } from './constants.js'
import { exec } from 'child_process'
import multer from 'multer'
import fs from 'fs'

const app = express()
const port = process.env.PORT ?? 5040

app.use(express.json({
    limit: '10mb'
}))
app.use(express.static(path.join(path.dirname(process.argv[1]), 'public')))

// URL rewriting for vue router web history mode
app.use((req, res, next) => {
    if(req.method === 'GET' && req.url.startsWith('/api') === false) {
        res.sendFile(path.join(path.dirname(process.argv[1]), 'public', 'index.html'))
        return
    }
    next()
})

const apiRouter = express.Router()

console.log(db.migrate())

apiRouter.get('/connections', (_req, res) => {
    try {
        const connections = db.getConnections()
        res.send(connections)
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

const connectionStruct = {
    name: string(),
    type: enums([CONNECTION_TYPES.POSTGRESQL, CONNECTION_TYPES.MYSQL]),
    host: string(),
    port: number(),
    username: string(),
    password: string(),
    database: nullable(string()),
    schema: optional(string())
}

apiRouter.post('/connection', (req, res) => {
    try {
        const newConnectionStruct = object(connectionStruct)

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

        const createdConnection = db.addConnection(
            req.body.name,
            req.body.type,
            req.body.host,
            req.body.port,
            req.body.username,
            req.body.password,
            req.body.database,
            req.body.schema
        )

        res.status(201).send(createdConnection)
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

apiRouter.get('/connection/:connection_id', async(req, res) => {
    let details = null

    try {
        details = db.getConnection(req.params.connection_id, req.query.database)
    } catch(e) {
        res.status(400).send(e.message)
        return
    }

    let databases = {}

    try {
        databases.data = await connection.getDatabases(req.params.connection_id, req.query.database)
        databases.success = true
    } catch(e) {
        databases.data = e.message
        databases.success = false
    }

    try {
        const tables = await connection.getTables(req.params.connection_id, req.query.database)

        res.send({
            details,
            databases,
            tables: {
                success: true,
                data: tables
            }
        })
    } catch(e) {
        res.send({
            details,
            databases,
            tables: {
                success: false,
                data: e.message === 'write CONNECT_TIMEOUT undefined:undefined' ? 'Unable to establish connection with database' : e.message
            }
        })
    }
})

apiRouter.put('/connection/:connection_id', async(req, res) => {
    try {
        const newConnectionStruct = object({
            ...connectionStruct,
            updated_at: string()
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

        const updatedConnection = db.updateConnection(
            req.params.connection_id,
            req.body.name,
            req.body.type,
            req.body.host,
            req.body.port,
            req.body.username,
            req.body.password,
            req.body.database,
            req.body.schema
        )

        res.status(200).send(updatedConnection)
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

apiRouter.delete('/connection/:connection_id', async(req, res) => {
    try {
        db.deleteConnection(req.params.connection_id)
        res.send({
            data: 'Connection deleted'
        })
    } catch(e) {
        console.error(e)
        res.send(e.message)
    }
})

apiRouter.get('/connection/:connection_id/:table_name', async(req, res) => {
    try {
        const tableDetails = await connection.getTableDetails(req.params.connection_id, req.query.database, req.params.table_name)
        res.send(tableDetails)
    } catch(e) {
        res.status(400).send(e.message)
    }
})

apiRouter.post('/connection/:connection_id/query', async(req, res) => {
    try {
        const result = await connection.runQuery(req.params.connection_id, req.query.database, req.body.query)
        res.send(result)
    } catch(e) {
        res.status(400).send(e.message)
    }
})

apiRouter.post('/connection/:connection_id/count', async(req, res) => {
    try {
        const activeConnection = db.getConnection(req.params.connection_id)

        let count = null

        // if mysql & no where condition, we use approx count for table with rows > 2,00,000
        if(activeConnection.type === 'mysql' && req.body.hasWhere === false) {
            const result = await connection.runQuery(
                req.params.connection_id,
                req.query.database,
                `SHOW TABLE STATUS LIKE '${req.body.tableName}'`
            )

            if(result[0].Rows > 200000) {
                count = result[0].Rows
            }
        }

        // if postgresql & no where condition, we use approx count for table with rows > 2,00,000
        if(activeConnection.type === 'postgresql' && req.body.hasWhere === false){
            const result = await connection.runQuery(
                req.params.connection_id,
                req.query.database,
                `
                    SELECT reltuples::bigint AS rows
                    FROM pg_class
                    WHERE oid = '${activeConnection.schema}.${req.body.tableName}'::regclass
                `
            )

            if(result[0].rows > 200000) {
                count = result[0].rows
            }
        }

        if(count === null) {
            const result = await connection.runQuery(req.params.connection_id, req.query.database, req.body.query)
            count = result[0].count
        }

        res.send({
            count
        })
    } catch(e) {
        res.status(400).send(e.message)
    }
})

apiRouter.post('/connection/:connection_id/saved_queries', async(req, res) => {
    try {
        const queries = db.getSavedQueries(req.params.connection_id)
        res.send(queries)
    } catch(e) {
        res.status(400).send(e.message)
    }
})

apiRouter.post('/connection/:connection_id/saved_query', async(req, res) => {
    try {
        const newQuery = db.addSavedQuery(req.body.name, req.body.query, req.params.connection_id)
        res.status(201).send(newQuery)
    } catch(e) {
        res.status(400).send(e.message)
    }
})

apiRouter.delete('/saved_query/:saved_query_id', async(req, res) => {
    try {
        db.deleteSavedQuery(req.params.saved_query_id)
        res.send({
            data: 'Saved Query deleted'
        })
    } catch(e) {
        res.status(400).send(e.message)
    }
})

const upload = multer({ dest: 'uploads/' })

apiRouter.post('/connection/:connection_id/import', upload.single('file'), async (req, res) => {
    try {
        const { connection_id } = req.params
        const { database } = req.body
        const filePath = req.file.path

        const connection = db.getConnection(connection_id, database)

        const command = `mysql --protocol=TCP -h ${connection.host} -P ${connection.port} -u ${connection.username} -p${connection.password} "${database}" < ${filePath}`

        console.log('import', { command })

        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(filePath)

            if (error) {
                res.status(500).send({ success: false, message: stderr })
                return
            }

            res.send({ success: true, message: 'Import completed successfully' })
        })
    } catch (e) {
        console.error(e)
        res.status(400).send(e.message)
    }
})

app.use('/api', apiRouter)

app.listen(port, () => {
    console.log(`App listening on port http://localhost:${port}`)
})
