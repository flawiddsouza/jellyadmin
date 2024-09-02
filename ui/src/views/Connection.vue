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
