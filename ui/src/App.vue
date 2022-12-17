<template>
    <Frame />
</template>

<script setup>
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import Frame from './components/Frame.vue'
import { useStore } from './store'

const router = useRouter()
const route = useRoute()
const store = useStore()
const { currentConnection } = storeToRefs(store)

function setDocumentTitle() {
    if(currentConnection.value === null) {
        return
    }

    const currentRoute = route.matched[route.matched.length - 1].path

    if(currentRoute === '/:connectionId') {
        document.title = `${currentConnection.value.name} - Jelly Database`
    }

    if(currentRoute === '/:connectionId/:tableName/select') {
        document.title = `Select: ${route.params.tableName} - ${currentConnection.value.name} - Jelly Database`
    }

    if(currentRoute === '/:connectionId/:tableName/structure') {
        document.title = `Table: ${route.params.tableName} - ${currentConnection.value.name} - Jelly Database`
    }
}

router.afterEach((to, _from, next) => {
    setDocumentTitle()
    next()
})

watch(currentConnection, () => {
    setDocumentTitle()
})
</script>
