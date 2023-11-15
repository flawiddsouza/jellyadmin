<template>
    <template v-if="pageLoaded">
        <div class="bold">Available Connections</div>
        <ul class="mt-1">
            <li v-for="(connection, connectionIndex) in connections">
                <router-link :to="getConnectionRoute(connection)">{{ getConnectionName(connection) }}</router-link>
                <button class="no-border no-padding no-background cursor-pointer vertical-align-middle ml-1" @click="editConnections[connection.id] = !editConnections[connection.id]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-edit" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"></path>
                        <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"></path>
                        <path d="M16 5l3 3"></path>
                    </svg>
                </button>
                <button class="no-border no-padding no-background cursor-pointer vertical-align-middle" @click="cloneConnection(connection)">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-copy" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                            <rect x="8" y="8" width="12" height="12" rx="2"></rect>
                            <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2"></path>
                        </svg>
                </button>
                <button class="no-border no-padding no-background cursor-pointer vertical-align-middle" @click="confirmDelete(connection)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-trash" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                        <line x1="4" y1="7" x2="20" y2="7"></line>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                        <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path>
                        <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path>
                    </svg>
                </button>
                <div class="mb-2" v-if="editConnections[connection.id]">
                    <UpdateConnection
                        :connection="connection"
                        @update="updateConnection($event, connectionIndex)"
                        @cancel="delete editConnections[connection.id]"
                    />
                </div>
            </li>
        </ul>
        <div v-if="connections.length === 0">You haven't added any connections</div>

        <div class="mt-2 bold">Add New Connection</div>
        <form @submit.prevent="addConnection" class="mt-1">
            <table>
                <tbody>
                    <tr>
                        <th>Name</th>
                        <td>
                            <input type="text" class="full-width" required v-model="newConnection.name">
                        </td>
                    </tr>
                    <tr>
                        <th>Type</th>
                        <td>
                            <select class="full-width" required v-model="newConnection.type" @change="handleNewConnectionTypeChange(newConnection)">
                                <option value="postgresql">PostgreSQL</option>
                                <option value="mysql">MySQL</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Host</th>
                        <td>
                            <input type="text" class="full-width" required v-model="newConnection.host">
                        </td>
                    </tr>
                    <tr>
                        <th>Port</th>
                        <td>
                            <NumberInput class="full-width" required v-model.number="newConnection.port" />
                        </td>
                    </tr>
                    <tr>
                        <th>Username</th>
                        <td>
                            <input type="text" class="full-width" required v-model="newConnection.username">
                        </td>
                    </tr>
                    <tr>
                        <th>Password</th>
                        <td>
                            <input type="text" class="full-width" required v-model="newConnection.password">
                        </td>
                    </tr>
                    <tr>
                        <th>Database</th>
                        <td>
                            <input type="text" class="full-width" v-model="newConnection.database">
                        </td>
                    </tr>
                    <tr v-if="newConnection.type === 'postgresql'">
                        <th>Schema</th>
                        <td>
                            <input type="text" class="full-width" required v-model="newConnection.schema">
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="mt-2">
                <button>Add Connection</button>
                <button type="button" class="ml-1" @click="newConnection = {}">Clear</button>
            </div>
        </form>
    </template>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import * as api from '../libs/api.js'
import NumberInput from '../components/NumberInput.vue'
import UpdateConnection from '../components/UpdateConnection.vue'

const pageLoaded = ref(false)
const connections = ref([])
const newConnection = ref({})
const editConnections = ref({})

async function getConnections() {
    const { data } = await api.getConnections()
    connections.value = data
}

function getConnectionRoute(connection) {
    if(connection.database === '') {
        return `/${connection.id}`
    }

    return `/${connection.id}?db=${connection.database}`
}

function getConnectionName(connection) {
    if(connection.database === '') {
        return connection.name
    }

    return `${connection.name} » ${connection.database}`
}

function handleNewConnectionTypeChange(newConnection) {
    if(newConnection.type === 'postgresql') {
        newConnection.port = 5432
        newConnection.schema = 'public'
    }

    if(newConnection.type === 'mysql') {
        newConnection.port = 3306
    }
}

async function addConnection() {
    await api.addConnection(newConnection.value)
    newConnection.value = {}
    await getConnections()
}

function cloneConnection(connection) {
    const connectionCopy = JSON.parse(JSON.stringify(connection))
    delete connectionCopy.id
    delete connectionCopy.created_at
    delete connectionCopy.updated_at
    newConnection.value = connectionCopy
}

async function updateConnection(connection, connectionIndex) {
    await api.updateConnection(JSON.parse(JSON.stringify(connection)))
    connections.value[connectionIndex] = connection
    delete editConnections.value[connection.id]
}

async function confirmDelete(connection) {
    if(confirm(`Are you sure you want to delete ${connection.name}?`)) {
        await api.deleteConnection(connection.id)
        await getConnections()
    }
}

onBeforeMount(async() => {
    await getConnections()
    pageLoaded.value = true
})
</script>
