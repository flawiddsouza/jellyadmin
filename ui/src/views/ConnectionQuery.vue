<template>
    <h2>Query</h2>

    <div class="message success mb-2" v-if="queryRan">
        <template v-if="rows.length === 0">No rows</template>
        <template v-else>{{ new Intl.NumberFormat().format(rows.length) }} {{ rows.length > 1 ? 'rows' : 'row' }} returned</template>
    </div>

    <div class="message error mb-2" v-if="error">{{ error }}</div>

    <table class="mb-2" v-if="rows.length > 0">
        <thead>
            <tr>
                <th v-for="rowHeader in rowHeaders">{{ rowHeader }}</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="row in rows">
                <td v-for="rowHeader in rowHeaders">{{ row[rowHeader] }}</td>
            </tr>
        </tbody>
    </table>

    <textarea style="width: 531px; height: 313px; padding: 3px;" v-model="query"></textarea>

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
const rowHeaders = ref([])
const rows = ref([])
const error = ref('')
const queryRan = ref(false)

async function runQuery() {
    rows.value = []
    rowHeaders.value = []
    error.value = ''

    if(route.query.sql !== query.value) {
        addQueryParamsToRoute(route, {
            sql: query.value
        })
    }

    const { success, data } = await api.runQuery(route.params.connectionId, query.value)

    if(success) {
        rows.value = data
        rowHeaders.value = rows.value.length > 0 ? Object.keys(rows.value[0]) : []
        queryRan.value = true
    } else {
        error.value = data
        queryRan.value = false
    }
}

onBeforeMount(() => {
    if(route.query.sql) {
        query.value = route.query.sql
        runQuery()
    }
})
</script>
