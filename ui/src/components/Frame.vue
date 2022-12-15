<template>
    <nav>
        <router-link to="/" @click="currentConnection = null">Jelly Database</router-link>
        <span v-if="currentConnection"> » <router-link :to="`/${currentConnection.id}`">{{ currentConnection.name }}</router-link> » Database: {{ currentConnection.database }}</span>
        <span v-if="$route.params.tableName"> » {{ getIfSelectOrTable($route) }}: {{ $route.params.tableName }}</span>
    </nav>
    <main>
        <router-view></router-view>
    </main>
</template>

<script setup>
import { useStore } from '../store'
import { storeToRefs } from 'pinia'

const store = useStore()
const { currentConnection } = storeToRefs(store)

function getIfSelectOrTable(route) {
    if(route.path.endsWith(`${route.params.tableName}/select`)) {
        return 'Select'
    }

    if(route.path.endsWith(`${route.params.tableName}/structure`)) {
        return 'Table'
    }
}
</script>
