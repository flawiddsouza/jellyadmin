<template>
    <div style="display: grid; grid-template-columns: 300px 1fr; overflow: auto; height: 100%; white-space: nowrap;">
        <aside style="overflow: auto">
            <ul style="list-style: none; margin-left: 0;">
                <li v-for="table in tables">
                    <router-link :to="`/${route.params.connectionId}/${table.table_name}/select`">select</router-link>&nbsp;<router-link :to="`/${route.params.connectionId}/${table.table_name}/structure`">{{ table.table_name }}</router-link>
                </li>
            </ul>
        </aside>
        <section style="overflow: auto; margin-left: 1rem;">
            <router-view :key="$route.fullPath"></router-view>
        </section>
    </div>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../store'
import { storeToRefs } from 'pinia'
import * as api from '../api.js'

const route = useRoute()
const store = useStore()
const { currentConnection } = storeToRefs(store)
const tables = ref([])

async function getConnection() {
    const connection = await api.getConnection(route.params.connectionId)
    currentConnection.value = connection.details
    tables.value = connection.tables
}

onBeforeMount(() => {
    getConnection()
})
</script>
