import Home from './views/Home.vue'
import Connection from './views/Connection.vue'
import ConnectionQuery from './views/ConnectionQuery.vue'
import ConnectionTableSelect from './views/ConnectionTableSelect.vue'
import ConnectionTableStructure from './views/ConnectionTableStructure.vue'

export default [
    {
        path: '/',
        component: Home
    },
    {
        path: '/:connectionId',
        component: Connection,
        children: [
            {
                path: 'query',
                component: ConnectionQuery
            },
            {
                path: ':tableName/select',
                component: ConnectionTableSelect
            },
            {
                path: ':tableName/structure',
                component: ConnectionTableStructure
            },
        ],
    },
]
