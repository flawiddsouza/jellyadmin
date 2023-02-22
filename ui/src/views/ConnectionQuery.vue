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

    <div class="mt-1 flex flex-jc-sb" style="width: 531px;">
        <button @click="runQuery">Run</button>
        <div>
            <label>
                <input type="checkbox" v-model="stopOnError">
                Stop on error
            </label>
        </div>
    </div>

    <div class="mt-1" style="width: 531px;">
        Query Parameters
        <table>
            <tr v-for="(queryParameter, queryParameterIndex) in queryParameters">
                <td>
                    <input type="text" placeholder="name" v-model="queryParameter.name">
                </td>
                <td>
                    <input type="text" placeholder="value" v-model="queryParameter.value">
                </td>
                <td>
                    <button @click="queryParameters.splice(queryParameterIndex, 1)">-</button>
                </td>
            </tr>
            <tr>
                <td colspan="3" style="text-align: center; user-select: none;" @click="queryParameters.push({ name: '', value: '' })">+ Add Item</td>
            </tr>
        </table>
        Use :name as variable to substitute with given value in above query.
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
const stopOnError = ref(true)
const queryParameters = ref([])

async function runQuery() {
    addQueryParamsToRoute(route, {
        sql: query.value,
        config: btoa(JSON.stringify({
            params: queryParameters.value
        }))
    })

    queriesRun.value = []

    const queriesToRun = query.value.split(';').filter(item => item)

    let result = []

    for(const queryToRun of queriesToRun) {
        let queryToRunWithQueryParametersSubstituted = queryToRun

        queryParameters.value.forEach(queryParameter => {
            queryToRunWithQueryParametersSubstituted = queryToRunWithQueryParametersSubstituted.replaceAll(':' + queryParameter.name, queryParameter.value)
        })

        const queryResult = await api.runQuery(route.params.connectionId, route.query.db, queryToRunWithQueryParametersSubstituted)

        result.push(queryResult)

        if(!queryResult.success && stopOnError.value) {
            break
        }
    }

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

        if(route.query.config) {
            try {
                const parsedConfig = JSON.parse(atob(route.query.config))

                if(parsedConfig.params) {
                    queryParameters.value = parsedConfig.params
                }
            } catch {}
        }

        if(!route.query.run) {
            runQuery()
        }
    }
})
</script>
