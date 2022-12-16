<template>
    <template v-if="connectionLoaded">
        <div style="display: grid; grid-template-columns: 300px 1fr; overflow: auto; height: 100%; white-space: nowrap;" v-if="!error">
            <aside style="overflow: auto">
                <div>
                    <router-link :to="`/${route.params.connectionId}/query`">Query</router-link>
                </div>
                <ul style="list-style: none; margin-left: 0;" class="mt-1">
                    <li v-for="table in tables">
                        <router-link :to="`/${route.params.connectionId}/${table.table_name}/select`">select</router-link>&nbsp;<router-link :to="`/${route.params.connectionId}/${table.table_name}/structure`">{{ table.table_name }}</router-link>
                    </li>
                </ul>
            </aside>
            <section style="overflow: auto; margin-left: 1rem;">
                <router-view :key="$route.fullPath"></router-view>
            </section>
        </div>
        <div v-else>
            <div class="message error">{{ error }}</div>
        </div>
    </template>
    <template v-else>Loading...</template>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../store'
import { storeToRefs } from 'pinia'
import * as api from '../libs/api.js'

const route = useRoute()
const store = useStore()
const { currentConnection } = storeToRefs(store)
const tables = ref([])
const connectionLoaded = ref(false)
const error = ref('')

async function getConnection() {
    const { success, data } = await api.getConnection(route.params.connectionId)
    if(success) {
        currentConnection.value = data.details
        if(data.tables.success) {
            tables.value = data.tables.data
        } else {
            error.value = data.tables.data
        }
    } else {
        error.value = data
    }
    connectionLoaded.value = true
}

onBeforeMount(() => {
    getConnection()
})
</script>
