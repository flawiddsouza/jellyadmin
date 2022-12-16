<template>
    <h2>Select: {{ route.params.tableName }}</h2>

    <div>
        <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/select`">Select data</router-link>
        <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/structure`" class="ml-2">Show structure</router-link>
    </div>

    <div class="mt-1">
        <code>{{ generatedQuery }}</code>
        <router-link :to="getGeneratedQueryEditRoute()" class="ml-2">Edit</router-link>
    </div>

    <template v-if="queryRan">
        <table class="mt-2" v-if="rows.length > 0">
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
        <div class="mt-2 message success" v-else>No rows</div>
    </template>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../libs/api.js'

const route = useRoute()
const rowHeaders = ref([])
const rows = ref([])
const error = ref('')
const queryRan = ref(false)
const generatedQuery = ref(`SELECT * FROM ${route.params.tableName} LIMIT 50`)

async function runQuery() {
    rows.value = []
    rowHeaders.value = []
    error.value = ''

    const { success, data } = await api.runQuery(route.params.connectionId, generatedQuery.value)

    if(success) {
        rows.value = data
        rowHeaders.value = rows.value.length > 0 ? Object.keys(rows.value[0]) : []
        queryRan.value = true
    } else {
        error.value = data
        queryRan.value = false
    }
}

function getGeneratedQueryEditRoute() {
    return `/${route.params.connectionId}/query?sql=${encodeURIComponent(generatedQuery.value)}`
}

onBeforeMount(() => {
    runQuery()
})
</script>
