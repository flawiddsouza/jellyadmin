<template>
    <h3>Table: {{ route.params.tableName }}</h3>
    <div>
        <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/select`">Select data</router-link>
        <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/structure`" class="ml-2">Show structure</router-link>
    </div>
    <table class="mt-2">
        <thead>
            <tr>
                <th>Column</th>
                <td>Type</td>
            </tr>
        </thead>
        <tbody>
            <tr v-for="column in columns">
                <th>{{ column.column_name }}</th>
                <td>{{ column.data_type }}</td>
            </tr>
        </tbody>
    </table>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../api.js'

const route = useRoute()
const columns = ref([])

async function getConnectionTable() {
    const { data: table } = await api.getConnectionTable(route.params.connectionId, route.params.tableName)
    columns.value = table.columns
}

onBeforeMount(() => {
    getConnectionTable()
})
</script>
