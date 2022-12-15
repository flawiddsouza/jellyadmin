<template>
    <input type="text" :value="modelValue" @keydown="numberOnly" pattern="[0-9]+([\.,][0-9]+)?" @input="$emit('update:modelValue', $event.target.value)">
</template>

<script setup>
const props = defineProps({
    modelValue: [Number, String]
})

function numberOnly(e) {
    let numbers = e.key === '0' || e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4' || e.key === '5' || e.key === '6' || e.key === '7' || e.key === '8' || e.key === '9' || e.key === ',' || e.key === '.'
    let usefulKeys = e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'F5' || (e.ctrlKey && e.key === 'a') || e.key === 'Tab' || (e.ctrlKey && e.key === 'v') || (e.ctrlKey && e.key === 'x') || (e.ctrlKey && e.key === 'c')
    if(!numbers && !usefulKeys) {
        e.preventDefault()
    }
}
</script>
