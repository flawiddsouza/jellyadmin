<template>
    <h2>Select: {{ route.params.tableName }}</h2>

    <div>
        <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/select`">Select data</router-link>
        <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/structure`" class="ml-2">Show structure</router-link>
    </div>

    <form @submit.prevent="runQuery(true)" class="mt-1">
        <fieldset>
            <legend><a href="#fieldset-select">Select</a></legend>
            <div>
                <div v-for="(querySelectItem, querySelectItemIndex) in querySelect">
                    <!-- <select>
                        <option></option>
                        <optgroup label="Functions">
                            <option>char_length</option>
                            <option>date</option>
                            <option>from_unixtime</option>
                            <option>lower</option>
                            <option>round</option>
                            <option>floor</option>
                            <option>ceil</option>
                            <option>sec_to_time</option>
                            <option>time_to_sec</option>
                            <option>upper</option>
                        </optgroup>
                        <optgroup label="Aggregation">
                            <option>avg</option>
                            <option>count</option>
                            <option>count distinct</option>
                            <option>group_concat</option>
                            <option>max</option>
                            <option>min</option>
                            <option>sum</option>
                        </optgroup>
                    </select>
                    ( -->
                    <select v-model="querySelectItem.column" @change="handleQuerySelectItemChange(querySelectItemIndex)">
                        <option value=""></option>
                        <option :value="column.name" v-for="column in columns">{{ column.name }}</option>
                    </select>
                    <!-- ) -->
                </div>
            </div>
        </fieldset>
        <fieldset>
            <legend><a href="#fieldset-search">Search</a></legend>
            <div>
                <div v-for="(querySearchItem, querySearchItemIndex) in querySearch">
                    <select v-model="querySearchItem.column" @change="handleQuerySearchItemChange(querySearchItemIndex)">
                        <option value=""></option>
                        <option :value="column.name" v-for="column in columns">{{ column.name }}</option>
                    </select>
                    <select v-model="querySearchItem.operator" @change="handleQuerySearchItemChange(querySearchItemIndex)">
                        <option>=</option>
                        <option>&lt;</option>
                        <option>&gt;</option>
                        <option>&lt;=</option>
                        <option>&gt;=</option>
                        <option>!=</option>
                        <option>LIKE</option>
                        <option>LIKE %%</option>
                        <option>REGEXP</option>
                        <option>IN</option>
                        <option>FIND_IN_SET</option>
                        <option>IS NULL</option>
                        <option>NOT LIKE</option>
                        <option>NOT REGEXP</option>
                        <option>NOT IN</option>
                        <option>IS NOT NULL</option>
                    </select>
                    <input type="search" v-model="querySearchItem.value" @input="handleQuerySearchItemChange(querySearchItemIndex)">
                </div>
            </div>
        </fieldset>
        <fieldset>
            <legend><a href="#fieldset-sort">Sort</a></legend>
            <div>
                <div v-for="(querySortItem, querySortItemIndex) in querySort">
                    <select v-model="querySortItem.column" @change="handleQuerySortItemChange(querySortItemIndex)">
                        <option value=""></option>
                        <option :value="column.name" v-for="column in columns">{{ column.name }}</option>
                    </select>
                    <label><input type="checkbox" v-model="querySortItem.descending">descending</label>
                </div>
            </div>
        </fieldset>
        <fieldset>
            <legend>Limit</legend>
            <div>
                <input type="number" style="width: 7ex" v-model="queryLimit">
            </div>
        </fieldset>
        <fieldset>
            <legend>Action</legend>
            <div>
                <button>Select</button>
            </div>
        </fieldset>
    </form>

    <div class="mt-1">
        <code v-html="highlightSql(generatedQuery)"></code>
        <router-link :to="getGeneratedQueryEditRoute()" class="ml-2">Edit</router-link>
    </div>

    <div class="message error mt-2" v-if="error">{{ error }}</div>

    <template v-if="queryRan">
        <table class="mt-2" v-if="rows.length > 0">
            <thead>
                <tr>
                    <th v-for="rowHeader in rowHeaders">{{ rowHeader }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in rows">
                    <td v-for="rowHeader in rowHeaders">{{ row[rowHeader] }}</td>
                </tr>
            </tbody>
        </table>
        <div class="mt-2 message success" v-else>No rows</div>
    </template>

    <div class="mt-1" v-if="rows.length > 0">
        {{ rows.length }} {{ rows.length > 1 ? 'rows' : 'row' }}
    </div>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../store.js'
import { storeToRefs } from 'pinia'
import * as api from '../libs/api.js'
import { highlight } from 'sql-highlight'
import { addQueryParamsToRoute } from '../libs/helpers.js'

const route = useRoute()
const store = useStore()
const { currentConnection } = storeToRefs(store)
const columns = ref([])
const rowHeaders = ref([])
const rows = ref([])
const error = ref('')
const queryRan = ref(false)
const generatedQuery = ref('')
const querySelect = ref([
    {
        column: ''
    }
])
const querySearch = ref([
    {
        column: '',
        operator: '=',
        value: ''
    }
])
const querySort = ref([
    {
        column: '',
        descending: false
    }
])
const queryLimit = ref('50')

async function getConnectionTable() {
    const { data: table } = await api.getConnectionTable(route.params.connectionId, route.params.tableName)
    columns.value = table.columns
}

function generateQuery() {
    const queryParts = ['SELECT']

    const querySelectTemp = querySelect.value.filter(querySelectItem => querySelectItem.column.trim())

    if(querySelectTemp.length === 0) {
        queryParts.push('*')
    } else {
        queryParts.push(querySelectTemp.map(querySelectItem => {
            if(currentConnection.value.type === 'mysql') {
                return `\`${querySelectItem.column}\``
            }

            if(currentConnection.value.type === 'postgresql') {
                return `"${querySelectItem.column}"`
            }

            return querySelectItem.column
        }).join(', '))
    }

    queryParts.push('FROM')

    let tableName = route.params.tableName

    if(currentConnection.value.type === 'mysql') {
        tableName = `\`${route.params.tableName}\``
    }

    if(currentConnection.value.type === 'postgresql') {
        tableName = `"${route.params.tableName}"`
    }

    queryParts.push(tableName)

    const querySearchTemp = querySearch.value.filter(querySearchItem => querySearchItem.column.trim())

    querySearchTemp.forEach((querySearchItem, querySearchItemIndex) => {
        if(querySearchItemIndex === 0) {
            queryParts.push('WHERE')
        } else {
            queryParts.push('AND')
        }

        queryParts.push(`${querySearchItem.column} ${querySearchItem.operator} ${querySearchItem.value}`)
    })

    const querySortTemp = querySort.value.filter(querySortItem => querySortItem.column.trim())

    querySortTemp.forEach((querySortItem, querySortItemIndex) => {
        if(querySortItemIndex === 0) {
            queryParts.push('ORDER BY')
        } else {
            queryParts.push(',')
        }

        queryParts.push(`${querySortItem.column}${querySortItem.descending ? ' DESC' : ''}`)
    })

    queryParts.push(`LIMIT ${queryLimit.value}`)

    querySelect.value = querySelectTemp
    querySelect.value.push({
        column: ''
    })

    querySearch.value = querySearchTemp
    querySearch.value.push({
        column: '',
        operator: '=',
        value: ''
    })

    querySort.value = querySortTemp
    querySort.value.push({
        column: '',
        descending: false
    })

    return queryParts.join(' ')
}

async function runQuery(manual=true) {
    generatedQuery.value = generateQuery()

    rows.value = []
    rowHeaders.value = []
    error.value = ''

    if(manual) {
        addQueryParamsToRoute(route, {
            filters: btoa(JSON.stringify({
                select: querySelect.value,
                search: querySearch.value,
                sort: querySort.value,
                limit: queryLimit.value
            }))
        })
    }

    const { success, data } = await api.runQuery(route.params.connectionId, generatedQuery.value)

    if(success) {
        rows.value = data
        rowHeaders.value = rows.value.length > 0 ? Object.keys(rows.value[0]) : []
        queryRan.value = true
    } else {
        error.value = data
        queryRan.value = false
    }
}

function getGeneratedQueryEditRoute() {
    return `/${route.params.connectionId}/query?sql=${encodeURIComponent(generatedQuery.value)}`
}

function highlightSql(sql) {
    return highlight(sql, {
        html: true
    })
}

function handleQuerySelectItemChange(querySelectItemIndex) {
    if(typeof querySelect.value[querySelectItemIndex + 1] === 'undefined') {
        querySelect.value.push({
            column: ''
        })
    }
}

function handleQuerySearchItemChange(querySearchItemIndex) {
    if(typeof querySearch.value[querySearchItemIndex + 1] === 'undefined') {
        querySearch.value.push({
            column: '',
            operator: '=',
            value: ''
        })
    }
}

function handleQuerySortItemChange(querySortItemIndex) {
    if(typeof querySort.value[querySortItemIndex + 1] === 'undefined') {
        querySort.value.push({
            column: '',
            descending: false
        })
    }
}

onBeforeMount(() => {
    getConnectionTable()
    if(route.query.filters) {
        try {
            const parsedFilters = JSON.parse(atob(route.query.filters))
            querySelect.value = parsedFilters.select
            querySearch.value = parsedFilters.search
            querySort.value = parsedFilters.sort
            queryLimit.value = parsedFilters.limit
        } catch {}
    }
    runQuery(false)
})
</script>
