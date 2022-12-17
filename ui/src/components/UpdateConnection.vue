<template>
    <form @submit.prevent="updateConnection" class="mt-1">
        <table>
            <tbody>
                <tr>
                    <th>Name</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connectionToUpdate.name">
                    </td>
                </tr>
                <tr>
                    <th>Type</th>
                    <td>
                        <select class="full-width" required v-model="connectionToUpdate.type">
                            <option value="postgresql">PostgreSQL</option>
                            <option value="mysql">MySQL</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Host</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connectionToUpdate.host">
                    </td>
                </tr>
                <tr>
                    <th>Port</th>
                    <td>
                        <NumberInput class="full-width" required v-model.number="connectionToUpdate.port" />
                    </td>
                </tr>
                <tr>
                    <th>Username</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connectionToUpdate.username">
                    </td>
                </tr>
                <tr>
                    <th>Password</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connectionToUpdate.password">
                    </td>
                </tr>
                <tr>
                    <th>Database</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connectionToUpdate.database">
                    </td>
                </tr>
                <tr v-if="connectionToUpdate.type === 'postgresql'">
                    <th>Schema</th>
                    <td>
                        <input type="text" class="full-width" required v-model="connectionToUpdate.schema">
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="mt-2">
            <button>Update Connection</button>
            <button type="button" class="ml-1" @click="emit('cancel')">Cancel</button>
        </div>
    </form>
</template>

<script setup>
import { ref } from 'vue'
import NumberInput from './NumberInput.vue';

const props = defineProps({
    connection: {
        type: Object,
        required: true
    }
})
const emit = defineEmits(['update', 'cancel'])
const connectionToUpdate = ref(JSON.parse(JSON.stringify(props.connection)))

function updateConnection() {
    emit('update', connectionToUpdate.value)
}
</script>
