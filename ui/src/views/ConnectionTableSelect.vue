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
        <div class="mt-2 message success" v-if="rows.length > 0">{{ new Intl.NumberFormat().format(rows.length) }} {{ rows.length > 1 ? 'rows' : 'row' }} returned</div>
        <table class="mt-2 sticky hover" v-if="rows.length > 0">
            <thead>
                <tr>
                    <th v-for="rowHeader in rowHeaders">{{ rowHeader }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in rows">
                    <td v-for="rowHeader in rowHeaders" :class="{ 'white-space-pre': row[rowHeader].type === 'text' && row[rowHeader].text.length > 100 }" @click.ctrl="row[rowHeader].edit = true">
                        <template v-if="!row[rowHeader].edit">
                            <template v-if="row[rowHeader].type === 'text'">
                                <div class="flex flex-jc-sb">
                                    <div>{{ row[rowHeader].text }}</div>
                                    <div class="ml-1">
                                        <button v-if="row[rowHeader].text.length === 100 && row[rowHeader].originalText.length > 100" @click="row[rowHeader].text = row[rowHeader].originalText">Expand</button>
                                        <button v-if="row[rowHeader].text.length > 100"  @click="row[rowHeader].text = row[rowHeader].originalText.slice(0, 100)">Collapse</button>
                                    </div>
                                </div>
                            </template>
                            <router-link :to="row[rowHeader].to" v-if="row[rowHeader].type === 'router-link'">{{ row[rowHeader].text }}</router-link>
                            <span v-if="row[rowHeader].type === 'null'" class="italic">NULL</span>
                        </template>
                        <template v-else>
                            <input type="text" :value="row[rowHeader].originalText" class="full-width" @keydown.esc="row[rowHeader].edit = false" @blur="updateRowColumn(row, rowHeader, $event.target.value)" @keydown.enter="updateRowColumn(row, rowHeader, $event.target.value)">
                        </template>
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="mt-2 message success" v-else>No rows</div>
    </template>
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
const indexes = ref([])
const foreignKeys = ref([])
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
    indexes.value = table.indexes
    foreignKeys.value = table.foreignKeys
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

        let column = querySearchItem.column

        if(currentConnection.value.type === 'mysql') {
            column = `\`${column}\``
        }

        if(currentConnection.value.type === 'postgresql') {
            column = `"${column}"`
        }

        let value = querySearchItem.value

        if(value) {
            if(currentConnection.value.type === 'mysql') {
                value = `'${value}'`
            }

            if(currentConnection.value.type === 'postgresql') {
                value = `'${value}'`
            }
        }

        queryParts.push(`${column} ${querySearchItem.operator} ${value}`)
    })

    const querySortTemp = querySort.value.filter(querySortItem => querySortItem.column.trim())

    querySortTemp.forEach((querySortItem, querySortItemIndex) => {
        if(querySortItemIndex === 0) {
            queryParts.push('ORDER BY')
        } else {
            queryParts.push(',')
        }

        let column = querySortItem.column

        if(currentConnection.value.type === 'mysql') {
            column = `\`${column}\``
        }

        if(currentConnection.value.type === 'postgresql') {
            column = `"${column}"`
        }

        queryParts.push(`${column}${querySortItem.descending ? ' DESC' : ''}`)
    })

    if(queryLimit.value !== '') {
        queryParts.push(`LIMIT ${queryLimit.value}`)
    }

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

    queryRan.value = false
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

        const foreignKeyMap = foreignKeys.value.reduce((prev, curr) => {
            prev[curr.column] = curr
            return prev
        }, {})

        rows.value.forEach(row => {
            columns.value.forEach(column => {
                if(row[column.name] === undefined) {
                    return
                }

                if(row[column.name] === null) {
                    row[column.name] = {
                        type: 'null',
                        originalText: null
                    }
                    return
                }

                if(column.name in foreignKeyMap === false) {
                    const text = typeof row[column.name] === 'string' ? row[column.name] : JSON.stringify(row[column.name], null, 4)
                    row[column.name] = {
                        type: 'text',
                        text: text.slice(0, 100),
                        originalText: text
                    }
                } else {
                    const filters = {
                        search: [
                            {
                                column: foreignKeyMap[column.name].foreign_column,
                                operator: '=',
                                value: row[column.name]
                            },
                            {
                                column: '',
                                operator: '=',
                                value: ''
                            }
                        ]
                    }
                    row[column.name] = {
                        type: 'router-link',
                        to: `/${route.params.connectionId}/${foreignKeyMap[column.name].foreign_table}/select?filters=${btoa(JSON.stringify(filters))}`,
                        text: row[column.name],
                        originalText: row[column.name]
                    }
                }
            })
        })

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

async function updateRowColumn(row, column, value) {
    if(row[column].edit === false) {
        return
    }

    row[column].edit = false

    if(currentConnection.value.type === 'postgresql') {
        return
    }

    if(row[column].type === 'text') {
        row[column]['originalText'] = value
        row[column]['text'] = value.slice(0, 100)

        let tableName = route.params.tableName

        if(currentConnection.value.type === 'mysql') {
            tableName = `\`${route.params.tableName}\``
        }

        if(currentConnection.value.type === 'postgresql') {
            tableName = `"${route.params.tableName}"`
        }

        let columnName = column

        if(currentConnection.value.type === 'mysql') {
            columnName = `\`${columnName}\``
        }

        if(currentConnection.value.type === 'postgresql') {
            columnName = `"${columnName}"`
        }

        const primaryColumnRaw = indexes.value.find(index => index.type === 'PRIMARY').column
        let primaryColumn = primaryColumnRaw

        if(currentConnection.value.type === 'mysql') {
            primaryColumn = `\`${primaryColumn}\``
        }

        if(currentConnection.value.type === 'postgresql') {
            primaryColumn = `"${primaryColumn}"`
        }

        const valueToUpdate = JSON.stringify(value).slice(1, -1)

        await api.runQuery(route.params.connectionId, `UPDATE ${tableName} SET ${columnName} = "${valueToUpdate}" WHERE ${primaryColumn} = "${row[primaryColumnRaw].text}"`)
    }
}

onBeforeMount(async() => {
    await getConnectionTable()
    if(route.query.filters) {
        try {
            const parsedFilters = JSON.parse(atob(route.query.filters))

            if(parsedFilters.select) {
                querySelect.value = parsedFilters.select
            }

            if(parsedFilters.search) {
                querySearch.value = parsedFilters.search
            }

            if(parsedFilters.sort) {
                querySort.value = parsedFilters.sort
            }

            if(parsedFilters.limit !== undefined) {
                queryLimit.value = parsedFilters.limit
            }
        } catch {}
    }
    await runQuery(false)
})
</script>
