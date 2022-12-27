<template>
    <nav>
        <router-link to="/" exact-active-class="active" @click="currentConnection = null">JellyAdmin</router-link>
        <span v-if="currentConnection">
             » <router-link :to="`/${currentConnection.id}`" :class="{ active: route.query.db === undefined && route.query.table === undefined }">{{ currentConnection.name }}</router-link>
            <template v-if="route.query.db">
                » Database: <router-link :to="`/${currentConnection.id}?db=${route.query.db}`" :class="{ active: route.query.db !== undefined && route.query.table === undefined }">{{ route.query.db }}</router-link>
                <span v-if="$route.query.table"> » {{ getIfSelectOrTable() }}: {{ $route.query.table }}</span>
            </template>
        </span>
    </nav>
    <main>
        <router-view></router-view>
    </main>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useStore } from '../store'
import { storeToRefs } from 'pinia'

const route = useRoute()
const store = useStore()
const { currentConnection } = storeToRefs(store)

function getIfSelectOrTable() {
    if(route.query.action === 'select') {
        return 'Select'
    }

    if(route.query.action === 'structure') {
        return 'Table'
    }
}
</script>
