<template>
    <h2>Import</h2>

    <template v-for="queryRun in queriesRun">
        <code v-html="highlightSql(queryRun.query)" class="white-space-pre"></code>
        <div class="message success mt-2 mb-2" v-if="queryRun.queryRan">
            <template v-if="queryRun.isSelectQuery">
                <template v-if="queryRun.rows.length === 0">No rows</template>
                <template v-else>{{ new Intl.NumberFormat().format(queryRun.rows?.length ?? 0) }} {{ queryRun.rows.length === 1 ? 'row' : 'rows' }} returned</template>
            </template>
            <template v-else>
                {{ queryRun.rowsAffected }} {{ queryRun.rowsAffected.length === 1 ? 'rows' : 'row' }} affected
            </template>
        </div>

        <div class="message error mt-2 mb-2" v-if="queryRun.error">{{ queryRun.error }}</div>

        <table class="mb-2 hover" v-if="queryRun.rows.length > 0">
            <thead>
                <tr>
                    <th v-for="rowHeader in queryRun.rowHeaders">{{ rowHeader }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in queryRun.rows">
                    <td v-for="rowHeader in queryRun.rowHeaders" class="white-space-pre">{{ row[rowHeader] }}</td>
                </tr>
            </tbody>
        </table>
    </template>

    <form @submit.prevent="importFile">
        <input type="file" required accept=".sql" @change="fileToImport = $event.target.files[0]" :ref="el => fileInput = el">

        <div class="mt-2">
            <button :disabled="isImporting">{{ isImporting ? 'Importing...' : 'Import' }}</button>
        </div>
    </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../libs/api.js'
import { fileToString, splitQueries } from '../libs/helpers.js'
import { highlight } from 'sql-highlight'
import { emitter } from '../libs/event-bus'

const route = useRoute()
const fileToImport = ref(null)
const queriesRun = ref([])
const fileInput = ref(null)
const isImporting = ref(false)

async function importFile() {
    isImporting.value = true
    queriesRun.value = []

    const file = fileToImport.value

    const { success, message } = await api.importFile(route.params.connectionId, route.query.db, file)

    if (success) {
        queriesRun.value.push({
            query: '',
            rows: [],
            rowHeaders: [],
            isSelectQuery: false,
            rowsAffected: 0,
            error: '',
            queryRan: true
        })
    } else {
        queriesRun.value.push({
            query: '',
            rows: [],
            rowHeaders: [],
            isSelectQuery: false,
            rowsAffected: 0,
            error: message,
            queryRan: false
        })
    }

    fileToImport.value = null
    fileInput.value.value = ''
    isImporting.value = false

    emitter.emit('reloadConnectionTables')
}

function highlightSql(sql) {
    return highlight(sql, {
        html: true
    }).trim()
}
</script>
