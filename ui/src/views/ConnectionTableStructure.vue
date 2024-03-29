<template>
    <h2>Table: {{ route.query.table }}</h2>

    <div>
        <router-link
            :to="`/${route.params.connectionId}?db=${route.query.db}&table=${route.query.table}&action=select`"
            :class="{ active: route.query.db !== undefined && route.query.action === 'select' }"
        >Select data</router-link>
        <router-link
            :to="`/${route.params.connectionId}?db=${route.query.db}&table=${route.query.table}&action=structure`"
            class="ml-2"
            :class="{ active: route.query.db !== undefined && route.query.action === 'structure' }"
        >Show structure</router-link>
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
    <button @click="copyCommaSeparatedColumnsToClipboard" style="margin-top: 0.5rem">Copy comma separated columns to clipboard</button>

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
                    <td><router-link :to="`/${route.params.connectionId}?db=${route.query.db}&table=${foreignKey.foreign_table}&action=structure`">{{ foreignKey.foreign_table }}</router-link>({{ foreignKey.foreign_column }})</td>
                    <td>{{ foreignKey.name }}</td>
                </tr>
            </tbody>
        </table>
    </template>

    <div class="mt-2">
        <button @click="dropTable">Drop</button>
    </div>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as api from '../libs/api.js'
import { wrapTableName } from '../libs/sql';

const route = useRoute()
const router = useRouter()
const columns = ref([])
const indexes = ref([])
const foreignKeys = ref([])

async function getConnectionTable() {
    const { data: table } = await api.getConnectionTable(route.params.connectionId, route.query.db, route.query.table)
    columns.value = table.columns
    indexes.value = table.indexes
    foreignKeys.value = table.foreignKeys
}

async function dropTable() {
    const dropTableQuery = `DROP TABLE ${wrapTableName(route.query.table)}`

    if(!confirm(dropTableQuery)) {
        return
    }

    const { success } = await api.runQuery(route.params.connectionId, route.query.db, dropTableQuery)

    if(!success) {
        alert('Failed to drop table')
        return
    }

    window.document.location.href = `/${route.params.connectionId}?db=${route.query.db}`
}

function copyCommaSeparatedColumnsToClipboard() {
    const columnsWithTableName = columns.value.map(column => `${route.query.table}.${column.name}`)
    navigator.clipboard.writeText(columnsWithTableName.join(', '))
    alert('Copied to clipboard')
}

onBeforeMount(() => {
    getConnectionTable()
})
</script>
