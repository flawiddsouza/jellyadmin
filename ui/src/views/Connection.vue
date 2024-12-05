<template>
    <template v-if="connectionLoaded">
        <template v-if="showDatabaseList">
            <form class="flex" @submit.prevent="createDatabase">
                <div>
                    <input type="text" v-model="newDatabaseName" required>
                </div>
                <div class="ml-1">
                    <button>Create Database</button>
                </div>
            </form>
            <div class="bold mt-1">Available Databases</div>
            <ul class="mt-1">
                <li v-for="database in databases">
                    <router-link :to="`/${route.params.connectionId}?db=${database.database}`">{{ database.database }}</router-link>
                    <button class="no-border no-padding no-background cursor-pointer vertical-align-middle ml-1" @click="dropDatabase(database.database)">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-trash" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                            <line x1="4" y1="7" x2="20" y2="7"></line>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                            <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path>
                            <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path>
                        </svg>
                    </button>
                </li>
            </ul>
            <div v-if="databases.length === 0">You haven't added any databases</div>
        </template>
        <template v-else>
            <div class="grid overflow-auto full-height" style="grid-template-columns: 300px 1fr; white-space: nowrap;" v-if="!error">
                <aside class="overflow-auto">
                    <div>
                        <router-link :to="`/${route.params.connectionId}?db=${route.query.db}&action=query`" :class="{ active: route.query.db !== undefined && route.query.action === 'query' }">Query</router-link>
                        <router-link :to="`/${route.params.connectionId}?db=${route.query.db}&action=import`" :class="{ active: route.query.db !== undefined && route.query.action === 'import' }" class="ml-1">Import</router-link>
                        <a href="#" @click.prevent="dropAllTables(route.query.db)" class="ml-1">Drop All Tables</a>
                    </div>
                    <ul style="list-style: none; margin-left: 0;" class="mt-1">
                        <li v-for="table in tables">
                            <router-link
                                @click="handleTableSelectClick(`/${route.params.connectionId}?db=${route.query.db}&table=${table.table_name}&action=select`)"
                                :to="`/${route.params.connectionId}?db=${route.query.db}&table=${table.table_name}&action=select`"
                                style="margin-right: 0.4rem"
                                :class="{ active: route.query.db !== undefined && route.query.table === table.table_name && route.query.action === 'select' }"
                            >select</router-link>
                            <router-link
                                :to="`/${route.params.connectionId}?db=${route.query.db}&table=${table.table_name}&action=structure`"
                                :class="{ active: route.query.db !== undefined && route.query.table === table.table_name && route.query.action === 'structure' }"
                            >{{ table.table_name }}</router-link>
                        </li>
                    </ul>
                    <div v-if="tables.length === 0">No tables found</div>
                </aside>
                <section class="overflow-auto ml-2">
                    <component :is="activeView" :key="$route.fullPath" />
                </section>
            </div>
        </template>
        <div v-if="error">
            <div class="message error">{{ error }}</div>
        </div>
    </template>
    <template v-else>Loading...</template>
</template>

<script setup>
import { onBeforeMount, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../store'
import { storeToRefs } from 'pinia'
import * as api from '../libs/api.js'
import { emitter } from '../libs/event-bus'
import ConnectionQuery from '../views/ConnectionQuery.vue'
import ConnectionImport from '../views/ConnectionImport.vue'
import ConnectionTableSelect from '../views/ConnectionTableSelect.vue'
import ConnectionTableStructure from '../views/ConnectionTableStructure.vue'
import { wrapDatabaseName } from '../libs/sql.js'

const route = useRoute()
const store = useStore()
const { currentConnection } = storeToRefs(store)
const databases = ref([])
const tables = ref([])
const connectionLoaded = ref(false)
const error = ref('')
const abortController = new AbortController()
const showDatabaseList = ref(false)
const activeView = ref(null)
const lastConnectedDatabase = ref(null)
const newDatabaseName = ref('')

async function getConnection(forceFetch = false) {
    if(lastConnectedDatabase.value === route.query.db && !forceFetch) {
        return
    }

    connectionLoaded.value = false

    lastConnectedDatabase.value = route.query.db

    const { success, data } = await api.getConnection(route.params.connectionId, route.query.db, abortController.signal)

    if(success) {
        currentConnection.value = data.details

        if(data.tables.success) {
            tables.value = data.tables.data
            currentConnection.value.autoCompletionSchema = data.tables.data.reduce((acc, curr) => {
                acc[curr.table_name] = curr.columns
                return acc
            }, {})
        } else {
            error.value = data.tables.data
        }

        if(data.databases.success) {
            databases.value = data.databases.data
        } else {
            error.value = data.databases.data
        }
    } else {
        error.value = data
    }

    connectionLoaded.value = true
}

function handleCurrentRoute() {
    const { db, table, action } = route.query

    if(!db) {
        showDatabaseList.value = true
    } else {
        showDatabaseList.value = false

        if(!table && !action) {
            activeView.value = null
        }

        if(!table && action === 'query') {
            activeView.value = ConnectionQuery
        }

        if(!table && action === 'import') {
            activeView.value = ConnectionImport
        }

        if(table && action === 'select') {
            activeView.value = ConnectionTableSelect
        }

        if(table && action === 'structure') {
            activeView.value = ConnectionTableStructure
        }
    }

    getConnection()
}

async function reloadTables() {
    const { success, data } = await api.getConnection(route.params.connectionId, route.query.db, abortController.signal)

    if(success) {
        if(data.tables.success) {
            tables.value = data.tables.data
        } else {
            error.value = data.tables.data
        }
    } else {
        error.value = data
    }
}

async function createDatabase() {
    const { success, data } = await api.runQuery(route.params.connectionId, route.query.db, `CREATE DATABASE ${wrapDatabaseName(newDatabaseName.value, currentConnection.value.type)}`)

    if(!success) {
        alert(`Failed to create database`)
        return
    }

    newDatabaseName.value = ''

    getConnection(true)
}

async function dropDatabase(databaseName) {
    if(confirm(`Are you sure you want to drop the database ${databaseName}?`)) {
        const { success, data } = await api.runQuery(route.params.connectionId, route.query.db, `DROP DATABASE ${wrapDatabaseName(databaseName, currentConnection.value.type)}`)

        if(!success) {
            alert(`Failed to drop database: ${data}`)
            return
        }

        getConnection(true)
    }
}

async function dropAllTables(databaseName) {
    if (tables.value.length === 0) {
        alert('No tables found to drop.')
        return
    }

    const userInput = prompt(`Are you sure you want to drop all tables in ${databaseName}? Type 'yes' to confirm.`)
    if (userInput !== 'yes') {
        return
    }

    const { success, data } = await api.runQuery(route.params.connectionId, databaseName, `DROP TABLE ${tables.value.map(table => wrapDatabaseName(table.table_name, currentConnection.value.type)).join(', ')}`)

    if (!success) {
        alert(`Failed to drop all tables: ${data}`)
        return
    }

    reloadTables()
}

function handleTableSelectClick(clickedRoute) {
    if(route.fullPath === clickedRoute && clickedRoute !== document.location.pathname + document.location.search) {
        emitter.emit('forceResetTableSelect')
    }
}

onBeforeMount(() => {
    handleCurrentRoute()
    emitter.on('reloadConnectionTables', reloadTables)
})

onBeforeUnmount(() => {
    emitter.off('reloadConnectionTables', reloadTables)
    abortController.abort()
})

watch(route, () => {
    handleCurrentRoute()
})
</script>
