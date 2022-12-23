<template>
    <div class="grid full-height" style="grid-template-rows: auto auto auto auto auto 1fr">
        <h2>Select: {{ route.params.tableName }}</h2>

        <div>
            <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/select`">Select data</router-link>
            <router-link :to="`/${route.params.connectionId}/${route.params.tableName}/structure`" class="ml-2">Show structure</router-link>
        </div>

        <form @submit.prevent="runQuery(true)" class="mt-1 overflow-auto">
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
            <div class="mt-2 message success" v-if="rows.length === 0">No rows</div>
            <div class="mt-2 overflow-auto">
                <table class="sticky hover" v-if="rows.length > 0">
                    <thead>
                        <tr>
                            <th>
                                <input type="checkbox" class="vertical-align-middle" :checked="selectedRowIds.length === rows.length" @click="toggleSelectAllRows">
                            </th>
                            <th v-for="rowHeader in rowHeaders">{{ rowHeader }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in rows" :class="{ 'selected': selectedRowIds.includes(row[primaryColumn].originalText) }">
                            <td>
                                <input type="checkbox" class="vertical-align-middle" :value="row[primaryColumn].originalText" v-model="selectedRowIds">
                            </td>
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
                                    <input type="text" :value="row[rowHeader].originalText" class="full-width" @keydown.esc="row[rowHeader].edit = false" @blur="updateRowColumn(row, rowHeader, $event.target.value)" @keydown.enter="updateRowColumn(row, rowHeader, $event.target.value)" v-if="row[rowHeader].inputType === 'text'">
                                    <textarea :value="row[rowHeader].originalText" class="full-width" @keydown.esc="row[rowHeader].edit = false" @blur="updateRowColumn(row, rowHeader, $event.target.value)" v-if="row[rowHeader].inputType === 'textarea'" v-textarea-fit-content spellcheck="false"></textarea>
                                </template>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <footer>
            <fieldset v-if="totalRows > rows.length">
                <legend>Page</legend>
                <template v-for="page in totalPages">
                    <template v-if="page === currentPage">
                        <span :class="{ 'ml-1': page > 1 }">{{ page }}</span>
                    </template>
                    <a href="#" :class="{ 'ml-1': page > 1 }" @click.prevent="changePage(page)" v-else>{{ page }}</a>
                </template>
            </fieldset>
            <fieldset>
                <legend>Whole result</legend>
                <label>
                    <input type="checkbox" value="1" class="vertical-align-middle" v-model="selectAllRows" />
                    {{ new Intl.NumberFormat().format(totalRows) }} rows
                </label>
            </fieldset>
            <!-- <fieldset>
                <legend>Modify</legend>
                <div>
                    <button title="Ctrl+click on a value to modify it.">Save</button>
                </div>
            </fieldset> -->
            <fieldset>
                <legend>Selected <span>({{ new Intl.NumberFormat().format(selectAllRows ? totalRows : selectedRowIds.length) }})</span></legend>
                <div>
                    <button disabled>Edit</button>
                    <button class="ml-1" disabled>Clone</button>
                    <button class="ml-1" disabled>Delete</button>
                </div>
            </fieldset>
            <fieldset>
                <legend>
                    Export <span>({{ new Intl.NumberFormat().format(selectedRowIds.length === 0 ? totalRows : (selectAllRows ? totalRows : selectedRowIds.length)) }})</span>
                </legend>
                <div>
                    <select>
                        <option value="text" selected>open</option>
                        <option value="file">save</option>
                        <!-- <option value="gz">gzip</option> -->
                    </select>
                    <select class="ml-1">
                        <option value="sql">SQL</option>
                        <option value="csv" selected>CSV,</option>
                        <!-- <option value="csv;">CSV;</option> -->
                        <!-- <option value="tsv">TSV</option> -->
                    </select>
                    <button class="ml-1">Export</button>
                </div>
            </fieldset>
        </footer>
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
const indexes = ref([])
const primaryColumn = ref(null)
const foreignKeys = ref([])
const rowHeaders = ref([])
const rows = ref([])
const totalRows = ref(0)
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
const selectedRowIds = ref([])
const selectAllRows = ref(false)
const totalPages = ref(1)
const currentPage = ref(1)

async function getConnectionTable() {
    const { data: table } = await api.getConnectionTable(route.params.connectionId, route.params.tableName)
    columns.value = table.columns
    indexes.value = table.indexes
    foreignKeys.value = table.foreignKeys

    primaryColumn.value = indexes.value.find(index => index.type === 'PRIMARY').column

    if(currentConnection.value.type === 'postgresql') {
        const regex = /\((.*)\)/
        const matches = regex.exec(primaryColumn.value)
        if(matches.length === 2) {
            primaryColumn.value  = matches[1]
        }
    }
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

    if(currentPage.value > 1) {
        queryParts.push(`OFFSET ${(currentPage.value * queryLimit.value) - queryLimit.value}`)
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
    totalRows.value = 0
    selectedRowIds.value = []

    if(manual) {
        addQueryParamsToRoute(route, {
            filters: btoa(JSON.stringify({
                select: querySelect.value,
                search: querySearch.value,
                sort: querySort.value,
                limit: queryLimit.value
            })),
            page: currentPage.value
        })
    }

    const { success, data } = await api.runQuery(route.params.connectionId, generatedQuery.value)

    if(success) {
        rows.value = data
        rowHeaders.value = rows.value.length > 0 ? Object.keys(rows.value[0]) : []


        let tableName = route.params.tableName

        if(currentConnection.value.type === 'mysql') {
            tableName = `\`${route.params.tableName}\``
        }

        if(currentConnection.value.type === 'postgresql') {
            tableName = `"${route.params.tableName}"`
        }

        const { data: totalRowsData } = await api.runQuery(route.params.connectionId, `SELECT COUNT(*) AS count FROM ${tableName}`)
        totalRows.value = totalRowsData[0].count

        totalPages.value = Math.ceil(totalRows.value / queryLimit.value)

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
                        originalText: null,
                        inputType: column.type.startsWith('json') ? 'textarea' : 'text',
                        columnType: column.type
                    }
                    return
                }

                if(column.name in foreignKeyMap === false) {
                    const text = typeof row[column.name] === 'string' ? row[column.name] : JSON.stringify(row[column.name], null, 4)
                    row[column.name] = {
                        type: 'text',
                        text: text.slice(0, 100),
                        originalText: text,
                        inputType: column.type.startsWith('json') ? 'textarea' : 'text',
                        columnType: column.type
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
                        originalText: row[column.name],
                        inputType: column.type.startsWith('json') ? 'textarea' : 'text',
                        columnType: column.type
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

        let primaryColumnWrapped = primaryColumn.value

        if(currentConnection.value.type === 'mysql') {
            primaryColumnWrapped = `\`${primaryColumnWrapped}\``
        }

        if(currentConnection.value.type === 'postgresql') {
            primaryColumnWrapped = `"${primaryColumnWrapped}"`
        }

        let valueToUpdate = value

        if(currentConnection.value.type === 'mysql') {
            valueToUpdate = `'${JSON.stringify(valueToUpdate).slice(1, -1)}'`
        }

        if(currentConnection.value.type === 'postgresql') {
            if(row[column].columnType === 'jsonb') {
                valueToUpdate = `'${valueToUpdate.replace(/'/g, "''")}'::jsonb`
            } else {
                valueToUpdate = `'${JSON.stringify(valueToUpdate).slice(1, -1)}'`
            }
        }

        let primaryColumnValue = row[primaryColumn.value].text

        if(currentConnection.value.type === 'mysql') {
            primaryColumnValue = `'${primaryColumnValue}'`
        }

        if(currentConnection.value.type === 'postgresql') {
            primaryColumnValue = `'${primaryColumnValue}'`
        }

        error.value = ''

        const { success, data } = await api.runQuery(route.params.connectionId, `UPDATE ${tableName} SET ${columnName} = ${valueToUpdate} WHERE ${primaryColumnWrapped} = ${primaryColumnValue}`)

        if(!success) {
            error.value = data
        }
    }
}

function toggleSelectAllRows() {
    if(selectedRowIds.value.length !== rows.value.length) {
        selectedRowIds.value = rows.value.map(row => row[primaryColumn.value].originalText)
    } else {
        selectedRowIds.value = []
    }
}

function changePage(page) {
    currentPage.value = page
    runQuery(true)
}

const vTextareaFitContent =  {
    mounted(element) {
        element.style.height = element.scrollHeight + 'px'
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

    if(route.query.page) {
        currentPage.value = Number(route.query.page)
    }

    await runQuery(false)
})
</script>
