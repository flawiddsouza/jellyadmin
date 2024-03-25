<template>
    <h2>Query</h2>

    <template v-for="queryRun in queriesRun">
        <div class="mb-2">
            <code v-html="highlightSql(queryRun.query)" class="white-space-pre"></code>
            <!-- <router-link :to="getGeneratedQueryEditRoute()" class="ml-2">Edit</router-link> -->
        </div>

        <div class="message success mb-2" v-if="queryRun.queryRan">
            <template v-if="queryRun.rows.length === 0">No rows</template>
            <template v-else>{{ new Intl.NumberFormat().format(queryRun.rows.length) }} {{ queryRun.rows.length > 1 ? 'rows' : 'row' }} returned ({{ queryRun.timeTaken }} seconds)</template>
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

    <CodeMirrorEditorSql v-model="query" :database="currentConnection.type" :schema="currentConnection.autoCompletionSchema" width="531px" height="313px" style="border: 1px solid rgb(204, 204, 204); font-family: monospace;" v-if="currentConnection" />

    <div class="mt-1 flex flex-jc-sb" style="width: 531px;">
        <div>
            <button @click="runQuery" v-if="!isRunning">Run</button>
            <button v-else disabled>Running...</button>
            <button @click="formatQuery" class="ml-2">Format</button>
        </div>
        <div>
            <div>
                <label>
                    <input type="checkbox" v-model="autoRunOnPageLoad">
                    Auto run on page load / refresh
                </label>
            </div>
            <div>
                <label>
                    <input type="checkbox" v-model="stopOnError">
                    Stop on error
                </label>
            </div>
        </div>
    </div>

    <div class="mt-2" style="width: 531px; white-space: normal;">
        <div style="font-size: 1.1em">Query Parameters</div>
        <table class="mt-0_5">
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
        <div class="mt-0_5">Use <code>:name</code> as variable to substitute with given value in above query.</div>

        <div class="mt-2">
            <div style="font-size: 1.1em">Reusing queries in subsequent queries</div>
            <div class="mt-0_5">You can reference a query using its order. So if you want to use the 1st query in the 2nd query you can do: <code>SELECT id from ($q1)</code>. Here <code>$q1</code> will be substituted with the 1st query and so on. Same way you can reuse queries in the subsequent queries.</div>
            <div class="mt-0_5">
                Example:<br>
                <code>
                    SELECT id FROM users WHERE status = 'INACTIVE';<br>
                    UPDATE users SET status = 'ACTIVE' WHERE id in ($q1);<br>
                    $q1;
                </code>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onBeforeMount, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../store'
import { storeToRefs } from 'pinia'
import * as api from '../libs/api.js'
import { addQueryParamsToRoute } from '../libs/helpers.js'
import Papa from 'papaparse'
import { format as sqlFormat } from 'sql-formatter'
import CodeMirrorEditorSql from '../components/CodeMirrorEditorSql.vue'
import { highlight } from 'sql-highlight'

const route = useRoute()
const store = useStore()
const { currentConnection } = storeToRefs(store)
const query = ref('')
const queriesRun = ref([])
const stopOnError = ref(true)
const queryParameters = ref([])
const exportAction = ref('open')
const exportType = ref('csv')
const autoRunOnPageLoad = ref(false)
const isRunning = ref(false)

watch(autoRunOnPageLoad, () => {
    addQueryParamsToRoute(route, {
        run: autoRunOnPageLoad.value ? '1' : '0'
    })
})

async function runQuery() {
    const addQueryParams = {
        sql: query.value
    }

    if(queryParameters.value.length) {
        addQueryParams.config = btoa(JSON.stringify({
            params: queryParameters.value
        }))
    }

    addQueryParamsToRoute(route, addQueryParams)

    queriesRun.value = []

    const queriesToRun = query.value.trim().split(';').filter(item => item)

    let result = []

    isRunning.value = true

    for(const [queryIndex, queryToRun] of queriesToRun.entries()) {
        let queryToRunWithQueryParametersSubstituted = queryToRun

        queryParameters.value.forEach(queryParameter => {
            queryToRunWithQueryParametersSubstituted = queryToRunWithQueryParametersSubstituted.replaceAll(':' + queryParameter.name, queryParameter.value)
        })

        let match
        let queryResult

        while(match = queryToRunWithQueryParametersSubstituted.match(/\$q(\d+)/)) {
            if(match[0] === `$q${queryIndex + 1}`) {
                queryResult = {
                    success: false,
                    data: 'Cannot reference same query in itself'
                }
                break
            }

            if(Number(match[1]) > queriesToRun.length) {
                queryResult = {
                    success: false,
                    data: `Cannot reference query ${match[1]} as it does not exist`
                }
                break
            }

            queriesToRun.forEach((_, queryIndexToReplace) => {
                queryToRunWithQueryParametersSubstituted = queryToRunWithQueryParametersSubstituted.replaceAll(`$q${queryIndexToReplace + 1}`, queriesToRun[queryIndexToReplace])
            })
        }

        if(!queryResult) {
            let startTime = new Date().getTime()
            queryResult = await api.runQuery(route.params.connectionId, route.query.db, queryToRunWithQueryParametersSubstituted)
            queryResult.timeTaken = (new Date().getTime() - startTime)/1000
        }

        queryResult.query = queryToRunWithQueryParametersSubstituted

        result.push(queryResult)

        if(!queryResult.success && stopOnError.value) {
            break
        }
    }

    result.forEach(resultItem => {
        const { success, data, query, timeTaken } = resultItem

        const queryRun = {
            query,
            rows: [],
            rowHeaders: [],
            error: '',
            queryRan: false,
            timeTaken: 0,
        }

        if(success) {
            queryRun.rows = data
            queryRun.rowHeaders = queryRun.rows.length > 0 ? Object.keys(queryRun.rows[0]) : []
            queryRun.queryRan = true
            queryRun.timeTaken = timeTaken
        } else {
            queryRun.error = data
            queryRun.queryRan = false
        }

        queriesRun.value.push(queryRun)
    })

    isRunning.value = false
}

async function formatQuery() {
    query.value = sqlFormat(query.value, {
        language: currentConnection.value.type,
        tabWidth: 4,
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

        if(route.query.run === '1') {
            autoRunOnPageLoad.value = route.query.run === '1'
            runQuery()
        }
    }
})

function keydownEventHandler(event) {
    if(event.ctrlKey && event.key === 'Enter') {
        runQuery()
    }
}

onMounted(() => {
    document.addEventListener('keydown', keydownEventHandler)
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', keydownEventHandler)
})

function highlightSql(sql) {
    return highlight(sql, {
        html: true
    })
}
</script>
