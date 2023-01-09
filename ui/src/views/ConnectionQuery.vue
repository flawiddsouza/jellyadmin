<template>
    <h2>Query</h2>

    <template v-for="queryRun in queriesRun">
        <div class="message success mb-2" v-if="queryRun.queryRan">
            <template v-if="queryRun.rows.length === 0">No rows</template>
            <template v-else>{{ new Intl.NumberFormat().format(queryRun.rows.length) }} {{ queryRun.rows.length > 1 ? 'rows' : 'row' }} returned</template>
        </div>

        <div class="message error mb-2" v-if="queryRun.error">{{ queryRun.error }}</div>

        <table class="mb-2 hover sticky" v-if="queryRun.rows.length > 0">
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

    <textarea style="width: 531px; height: 313px; padding: 3px;" v-model="query" spellcheck="false"></textarea>

    <div class="mt-1">
        <button @click="runQuery">Run</button>
    </div>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../libs/api.js'
import { addQueryParamsToRoute } from '../libs/helpers.js'

const route = useRoute()
const query = ref('')
const queriesRun = ref([])

async function runQuery() {
    if(route.query.sql !== query.value) {
        addQueryParamsToRoute(route, {
            sql: query.value
        })
    }

    queriesRun.value = []

    const queriesToRun = query.value.split(';').filter(item => item)

    const result = await Promise.all(queriesToRun.map(queryToRun => {
        return api.runQuery(route.params.connectionId, route.query.db, queryToRun)
    }))

    result.forEach(resultItem => {
        const { success, data } = resultItem

        const queryRun = {
            rows: [],
            rowHeaders: [],
            error: '',
            queryRan: false
        }

        if(success) {
            queryRun.rows = data
            queryRun.rowHeaders = queryRun.rows.length > 0 ? Object.keys(queryRun.rows[0]) : []
            queryRun.queryRan = true
        } else {
            queryRun.error = data
            queryRun.queryRan = false
        }

        queriesRun.value.push(queryRun)
    })
}

onBeforeMount(() => {
    if(route.query.sql) {
        query.value = route.query.sql
        runQuery()
    }
})
</script>
