<template>
    <div class="bold">Available Connections</div>
    <ul class="mt-1">
        <li v-for="connection in connections">
            <router-link :to="`/${connection.id}`">{{ connection.name }}</router-link>
        </li>
    </ul>
    <div class="mt-2 bold">Add New Connection</div>
    <form @submit.prevent="addConnection" class="mt-1">
        <table>
            <tbody>
                <tr>
                    <th>Name</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connection.name">
                    </td>
                </tr>
                <tr>
                    <th>Type</th>
                    <td>
                        <select class="full-width" required v-model="connection.type">
                            <option value="postgresql">PostgreSQL</option>
                            <option value="mysql">MySQL</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Host</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connection.host">
                    </td>
                </tr>
                <tr>
                    <th>Port</th>
                    <td>
                        <NumberInput class="full-width" required v-model.number="connection.port" />
                    </td>
                </tr>
                <tr>
                    <th>Username</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connection.username">
                    </td>
                </tr>
                <tr>
                    <th>Password</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connection.password">
                    </td>
                </tr>
                <tr>
                    <th>Database</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connection.database">
                    </td>
                </tr>
                <tr v-if="connection.type === 'postgresql'">
                    <th>Schema</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connection.schema">
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="mt-2">
            <button>Add Connection</button>
        </div>
    </form>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import * as api from '../api.js'
import NumberInput from '../components/NumberInput.vue'

const connections = ref([])
const connection = ref({})

async function getConnections() {
    const { data } = await api.getConnections()
    connections.value = data
}

async function addConnection() {
    await api.addConnection(connection.value)
    connection.value = {}
    await getConnections()
}

onBeforeMount(() => {
    getConnections()
})
</script>
