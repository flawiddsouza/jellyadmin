<template>
    <h3>{{ heading }}</h3>
    <p>
        <router-link to="/">Home</router-link>
        <router-link to="/page2" style="margin-left: 1rem">Page 2</router-link>
    </p>
    <router-view></router-view>
</template>

<script setup>
import { ref } from 'vue'

const heading = ref('This is the frame component')
</script>
