import Home from './views/Home.vue'
import Connection from './views/Connection.vue'

export default [
    {
        path: '/',
        component: Home
    },
    {
        path: '/:connectionId',
        component: Connection
    },
]
