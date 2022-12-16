<template>
    <h2>Table: {{ route.params.tableName }}</h2>

    <div>
        <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/select`">Select data</router-link>
        <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/structure`" class="ml-2">Show structure</router-link>
    </div>

    <table class="mt-2">
        <thead>
            <tr>
                <th>Column</th>
                <td>Type</td>
                <td>Comment</td>
            </tr>
        </thead>
        <tbody>
            <tr v-for="column in columns">
                <th>{{ column.name }}</th>
                <td>
                    {{ column.type }}
                    <span class="italic" v-if="column.nullable">NULL</span>
                    <span class="italic" v-if="column.auto_increment">Auto Increment</span>
                    <template v-if="column.default_value">[<span class="bold">{{ column.default_value }}</span>]</template>
                </td>
                <td>{{ column.comment }}</td>
            </tr>
        </tbody>
    </table>

    <template v-if="indexes.length > 0">
        <h3 class="mt-2">Indexes</h3>

        <table class="mt-1">
            <thead>
                <tr>
                    <th>Type</th>
                    <td>Column</td>
                    <td>Name</td>
                </tr>
            </thead>
            <tbody>
                <tr v-for="index in indexes">
                    <th>{{ index.type }}</th>
                    <td>{{ index.column }}</td>
                    <td>{{ index.name }}</td>
                </tr>
            </tbody>
        </table>
    </template>

    <template v-if="foreignKeys.length > 0">
        <h3 class="mt-2">Foreign keys</h3>

        <table class="mt-1">
            <thead>
                <tr>
                    <th>Source</th>
                    <td>Target</td>
                    <td>Name</td>
                </tr>
            </thead>
            <tbody>
                <tr v-for="foreignKey in foreignKeys">
                    <th>{{ foreignKey.column }}</th>
                    <td><router-link :to="`/${route.params.connectionId}/${foreignKey.foreign_table}/structure`">{{ foreignKey.foreign_table }}</router-link>({{ foreignKey.foreign_column }})</td>
                    <td>{{ foreignKey.name }}</td>
                </tr>
            </tbody>
        </table>
    </template>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../libs/api.js'

const route = useRoute()
const columns = ref([])
const indexes = ref([])
const foreignKeys = ref([])

async function getConnectionTable() {
    const { data: table } = await api.getConnectionTable(route.params.connectionId, route.params.tableName)
    columns.value = table.columns
    indexes.value = table.indexes
    foreignKeys.value = table.foreignKeys
}

onBeforeMount(() => {
    getConnectionTable()
})
</script>
