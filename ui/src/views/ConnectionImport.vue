<template>
    <h2>Import</h2>

    <template v-for="queryRun in queriesRun">
        <code v-html="highlightSql(queryRun.query)" class="white-space-pre"></code>
        <div class="message success mt-2 mb-2" v-if="queryRun.queryRan">
            <template v-if="queryRun.isSelectQuery">
                <template v-if="queryRun.rows.length === 0">No rows</template>
                <template v-else>{{ new Intl.NumberFormat().format(queryRun.rows.length) }} {{ queryRun.rows.length > 1 ? 'rows' : 'row' }} returned</template>
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
            <button>Import</button>
            <label class="ml-1">
                <input type="checkbox" v-model="stopOnError"> Stop on error
            </label>
        </div>
    </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../libs/api.js'
import { fileToString } from '../libs/helpers.js'
import { highlight } from 'sql-highlight'

const route = useRoute()
const fileToImport = ref(null)
const queriesRun = ref([])
const fileInput = ref(null)
const stopOnError = ref(false)

async function importFile() {
    queriesRun.value = []

    const queriesToRun = (await fileToString(fileToImport.value)).split(';').filter(item => item && item.trim())

    fileToImport.value = null
    fileInput.value.value = ''

    for(const queryToRun of queriesToRun) {
        const { success, data } = await api.runQuery(route.params.connectionId, route.query.db, queryToRun)

        const queryRun = {
            query: queryToRun,
            rows: [],
            rowHeaders: [],
            rows: {},
            isSelectQuery: true,
            rowsAffected: 0,
            error: '',
            queryRan: false
        }

        if(success) {
            if(Array.isArray(data)) {
                queryRun.rows = data
                queryRun.rowHeaders = queryRun.rows.length > 0 ? Object.keys(queryRun.rows[0]) : []
            } else {
                queryRun.rowsAffected = data.affectedRows
                queryRun.isSelectQuery = false
            }
            queryRun.queryRan = true
        } else {
            queryRun.error = data
            queryRun.queryRan = false
        }

        queriesRun.value.push(queryRun)

        if(stopOnError.value && !success) {
            return
        }
    }
}

function highlightSql(sql) {
    return highlight(sql, {
        html: true
    }).trim()
}
</script>
