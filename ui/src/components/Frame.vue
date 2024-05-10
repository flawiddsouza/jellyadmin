<template>
    <nav class="flex flex-jc-sb flex-ai-c">
        <div>
            <router-link to="/" exact-active-class="active" @click="currentConnection = null">JellyAdmin</router-link>
            <span v-if="currentConnection">
                » <router-link :to="`/${currentConnection.id}`" :class="{ active: route.query.db === undefined && route.query.table === undefined }">{{ currentConnection.name }}</router-link>
                <template v-if="route.query.db">
                    » Database: <router-link :to="`/${currentConnection.id}?db=${route.query.db}`" :class="{ active: route.query.db !== undefined && route.query.table === undefined }">{{ route.query.db }}</router-link>
                    <span v-if="$route.query.table"> » {{ getIfSelectOrTable() }}: {{ $route.query.table }}</span>
                </template>
            </span>
        </div>
        <div>
            <div class="flex flex-ai-c" v-if="route.query.action === 'query'">
                <div class="mr-2" v-if="savedQueries.length > 0">
                    Saved Queries:
                    <select v-model="selectedSavedQuery" :title="selectedSavedQuery?.sql">
                        <option v-for="savedQuery in savedQueries" :value="savedQuery">{{ formatDateTime(savedQuery.createdAt) }} | {{ savedQuery.name }}</option>
                    </select>
                    <button class="ml-1" @click="loadQuery()">Load</button>
                    <button class="ml-1" @click="deleteQuery()">Delete</button>
                </div>
                <div>
                    <button @click="saveCurrentQuery" :disabled="savingQuery">Save Current Query</button>
                </div>
            </div>
        </div>
    </nav>
    <main>
        <router-view></router-view>
    </main>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { useStore } from '../store'
import { storeToRefs } from 'pinia'
import { emitter } from '../libs/event-bus'

const route = useRoute()
const store = useStore()
const { currentConnection, savedQueries, selectedSavedQuery } = storeToRefs(store)
const savingQuery = ref(false)

function getIfSelectOrTable() {
    if(route.query.action === 'select') {
        return 'Select'
    }

    if(route.query.action === 'structure') {
        return 'Table'
    }
}

async function getCurrentQuery() {
    return new Promise((resolve) => {
        function handler(sql) {
            resolve(sql)
            emitter.off('currentQuery', handler)
        }
        emitter.on('currentQuery', handler)
        emitter.emit('getCurrentQuery')
    })
}

async function saveCurrentQuery() {
    savingQuery.value = true

    const currentQuery = await getCurrentQuery()

    let openaiApiKey = localStorage.getItem('openai-api-key')

    if(!openaiApiKey) {
        openaiApiKey = prompt('Enter your OpenAI API Key')
        if(!openaiApiKey) {
            savingQuery.value = false
            alert('OpenAI API Key is required to save queries')
            return
        }
        localStorage.setItem('openai-api-key', openaiApiKey)
    }

    const url = 'https://api.openai.com/v1/chat/completions'
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{
                role: 'user',
                content: 'give a descriptive title for this sql query - no explanation needed  - just output the title: ' + currentQuery
            }],
            temperature: 0.7
        })
    }

    let name = ''

    try {
        const response = await fetch(url, options)
        const data = await response.json()
        if(data.error && data.error.code === 'invalid_api_key') {
            localStorage.removeItem('openai-api-key')
            alert('Invalid OpenAI API Key')
            throw new Error('Invalid OpenAI API Key')
        }
        name = data.choices[0].message.content
    } catch (error) {
        name = prompt('Enter a name for this query')
    }

    store.addSavedQuery({
        name: name,
        query: currentQuery,
    })

    savingQuery.value = false
}

function loadQuery() {
    emitter.emit('loadQuery', selectedSavedQuery.value.query)
}

function deleteQuery() {
    store.deleteSavedQuery(selectedSavedQuery.value.id)
}

function formatDateTime(date) {
    return dayjs(date).format('DD-MMM-YY hh:mm:ss A')
}

watch(currentConnection, () => {
    store.loadSavedQueries()
})
</script>
