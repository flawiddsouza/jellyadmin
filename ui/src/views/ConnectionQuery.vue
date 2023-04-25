<template>
    <h2>Query</h2>

    <template v-for="queryRun in queriesRun">
        <div class="message success mb-2" v-if="queryRun.queryRan">
            <template v-if="queryRun.rows.length === 0">No rows</template>
            <template v-else>{{ new Intl.NumberFormat().format(queryRun.rows.length) }} {{ queryRun.rows.length > 1 ? 'rows' : 'row' }} returned</template>
        </div>

        <div class="message error mb-2" v-if="queryRun.error">{{ queryRun.error }}</div>

        <table class="mb-2 hover sticky" v-if="queryRun.rows.length > 0">
            <thead>
                <tr>
                    <th v-for="rowHeader in queryRun.rowHeaders">{{ rowHeader }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in queryRun.rows">
                    <td v-for="rowHeader in queryRun.rowHeaders" class="white-space-pre">{{ row[rowHeader] }}</td>
                </tr>
            </tbody>
        </table>

        <form @submit.prevent="exportRows(queryRun)" style="margin-bottom: 1rem;">
            <fieldset style="margin-top: 0;">
                <legend>Export <span>({{ queryRun.rows.length }})</span></legend>
                <div>
                    <select v-model="exportAction">
                        <option value="save">save</option>
                        <option value="open">open</option>
                    </select>
                    <select v-model="exportType" class="ml-1" style="width: 53px;">
                        <option value="csv">CSV,</option>
                        <option value="csv;">CSV;</option>
                        <option value="json">JSON</option>
                    </select>
                    <button class="ml-1">Export</button>
                </div>
            </fieldset>
        </form>
    </template>

    <textarea style="width: 531px; height: 313px; padding: 3px;" v-model="query" spellcheck="false"></textarea>

    <div class="mt-1 flex flex-jc-sb" style="width: 531px;">
        <button @click="runQuery">Run</button>
        <div>
            <label>
                <input type="checkbox" v-model="stopOnError">
                Stop on error
            </label>
        </div>
    </div>

    <div class="mt-1" style="width: 531px;">
        Query Parameters
        <table>
            <tr v-for="(queryParameter, queryParameterIndex) in queryParameters">
                <td>
                    <input type="text" placeholder="name" v-model="queryParameter.name">
                </td>
                <td>
                    <input type="text" placeholder="value" v-model="queryParameter.value">
                </td>
                <td>
                    <button @click="queryParameters.splice(queryParameterIndex, 1)">-</button>
                </td>
            </tr>
            <tr>
                <td colspan="3" style="text-align: center; user-select: none;" @click="queryParameters.push({ name: '', value: '' })">+ Add Item</td>
            </tr>
        </table>
        Use :name as variable to substitute with given value in above query.
    </div>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../libs/api.js'
import { addQueryParamsToRoute } from '../libs/helpers.js'
import Papa from 'papaparse'

const route = useRoute()
const query = ref('')
const queriesRun = ref([])
const stopOnError = ref(true)
const queryParameters = ref([])
const exportAction = ref('open')
const exportType = ref('csv')

async function runQuery() {
    addQueryParamsToRoute(route, {
        sql: query.value,
        config: btoa(JSON.stringify({
            params: queryParameters.value
        }))
    })

    queriesRun.value = []

    const queriesToRun = query.value.trim().split(';').filter(item => item)

    let result = []

    for(const queryToRun of queriesToRun) {
        let queryToRunWithQueryParametersSubstituted = queryToRun

        queryParameters.value.forEach(queryParameter => {
            queryToRunWithQueryParametersSubstituted = queryToRunWithQueryParametersSubstituted.replaceAll(':' + queryParameter.name, queryParameter.value)
        })

        const queryResult = await api.runQuery(route.params.connectionId, route.query.db, queryToRunWithQueryParametersSubstituted)

        result.push(queryResult)

        if(!queryResult.success && stopOnError.value) {
            break
        }
    }

    result.forEach(resultItem => {
        const { success, data } = resultItem

        const queryRun = {
            rows: [],
            rowHeaders: [],
            error: '',
            queryRan: false
        }

        if(success) {
            queryRun.rows = data
            queryRun.rowHeaders = queryRun.rows.length > 0 ? Object.keys(queryRun.rows[0]) : []
            queryRun.queryRan = true
        } else {
            queryRun.error = data
            queryRun.queryRan = false
        }

        queriesRun.value.push(queryRun)
    })
}

async function exportRows(queryRun) {
    let rowsToExport = queryRun.rows

    if(exportType.value.startsWith('csv')) {
        rowsToExport = rowsToExport.map(item => {
            Object.keys(item).forEach(key => {
                if(item[key] instanceof Object) {
                    item[key] = JSON.stringify(item[key], null, 4)
                }
            })

            return item
        })
    }

    let textToExport = ''

    if(exportType.value.startsWith('csv')) {
        textToExport = Papa.unparse(rowsToExport, {
            delimiter: exportType.value === 'csv' ? ',' : ';'
        })
    }

    if(exportType.value === 'json') {
        textToExport = JSON.stringify(rowsToExport, null, 4)
    }

    if(exportAction.value === 'open') {
        const win = window.open()
        const pre = win.document.createElement('pre')
        pre.style.wordBreak = 'break-word'
        pre.style.whiteSpace = 'pre-wrap'
        pre.textContent = textToExport
        win.document.body.appendChild(pre)
    }

    if(exportAction.value === 'save') {
        let blob = null
        let fileName = null

        if(exportType.value.startsWith('csv')) {
            // BOM support for special characters in Excel
            const byteOrderMark = '\ufeff'

            blob = new Blob([byteOrderMark, textToExport], {
                type: 'text/csv;charset=utf-8;'
            })

            fileName = `result.csv`
        } else {
            blob = new Blob([textToExport], {
                type: 'application/json;charset=utf-8;'
            })

            fileName = `result.json`
        }

        const link = document.createElement('a')

        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
    }
}

onBeforeMount(() => {
    if(route.query.sql) {
        query.value = route.query.sql

        if(route.query.config) {
            try {
                const parsedConfig = JSON.parse(atob(route.query.config))

                if(parsedConfig.params) {
                    queryParameters.value = parsedConfig.params
                }
            } catch {}
        }

        if(!route.query.run) {
            runQuery()
        }
    }
})
</script>
