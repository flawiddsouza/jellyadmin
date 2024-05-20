<template>
    <div class="grid full-height" :style="`grid-template-rows: auto auto auto auto auto ${error ? 'auto': ''} 1fr`">
        <h2>Select: {{ route.query.table }}</h2>

        <div>
            <router-link
                @click="handleTableSelectClick(`/${route.params.connectionId}?db=${route.query.db}&table=${route.query.table}&action=select`)"
                :to="`/${route.params.connectionId}?db=${route.query.db}&table=${route.query.table}&action=select`"
                :class="{ active: route.query.db !== undefined && route.query.action === 'select' }"
            >Select data</router-link>
            <router-link
                :to="`/${route.params.connectionId}?db=${route.query.db}&table=${route.query.table}&action=structure`"
                class="ml-2"
                :class="{ active: route.query.db !== undefined && route.query.action === 'structure' }"
            >Show structure</router-link>
        </div>

        <form @submit.prevent="currentPage = 1; runQuery(true)" class="mt-1 overflow-auto">
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
                            <!-- <option>REGEXP</option> -->
                            <option>IN</option>
                            <!-- <option>FIND_IN_SET</option> -->
                            <option>IS NULL</option>
                            <option>NOT LIKE</option>
                            <!-- <option>NOT REGEXP</option> -->
                            <option>NOT IN</option>
                            <option>IS NOT NULL</option>
                        </select>
                        <input type="search" v-model="querySearchItem.value" @input="handleQuerySearchItemChange(querySearchItemIndex)" :ref="el => querySearchInputRef[querySearchItem.column] = el">
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
                            <th v-for="rowHeader in rowHeaders" class="column-header">
                                <a
                                    :href="generateColumnHeaderSortUrl(rowHeader, false)"
                                    @click.prevent="currentPage = 1; handleColumnHeaderSortClick(rowHeader, false)"
                                >
                                    <span>{{ rowHeader }}</span>
                                </a>
                                <span class="column">
                                    <a
                                        :href="generateColumnHeaderSortUrl(rowHeader, true)"
                                        @click.prevent="currentPage = 1; handleColumnHeaderSortClick(rowHeader, true)"
                                        title="descending"
                                        class="no-text-decoration"
                                    >&nbsp;↓</a>
                                    <a
                                        href="#"
                                        @click.prevent="addColumnToSearch(rowHeader)"
                                        title="Search"
                                        class="no-text-decoration"
                                    >&nbsp;=</a>
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in rows" :class="{ 'selected': selectedRowIds.includes(getSelectedRowId(row)) }">
                            <td>
                                <input type="checkbox" class="vertical-align-middle" :value="getSelectedRowId(row)" v-model="selectedRowIds">
                            </td>
                            <td v-for="rowHeader in rowHeaders" :class="{ 'white-space-pre': row[rowHeader].type === 'text' && row[rowHeader].text.length > 100 }" @click.ctrl="updateRowColumnValue = row[rowHeader].originalText !== null ? row[rowHeader].originalText : 'null'; row[rowHeader].edit = true">
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
                                    <input type="text" :value="row[rowHeader].originalText !== null ? row[rowHeader].originalText : 'null'" class="full-width" @input="updateRowColumnValue = $event.target.value" @keydown.esc="row[rowHeader].edit = false" @blur="row[rowHeader].edit = false; updateRowColumn(row, rowHeader);" @keydown.enter="row[rowHeader].edit = false" v-if="row[rowHeader].inputType === 'text'" v-focus>
                                    <textarea :value="row[rowHeader].originalText !== null ? row[rowHeader].originalText : 'null'" class="full-width"  @input="updateRowColumnValue = $event.target.value" @keydown.esc="row[rowHeader].edit = false" @blur="row[rowHeader].edit = false; updateRowColumn(row, rowHeader);" v-if="row[rowHeader].inputType === 'textarea'" v-textarea-fit-content spellcheck="false" v-focus></textarea>
                                </template>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>

        <footer v-show="rows.length > 0">
            <fieldset v-if="totalRows > rows.length">
                <legend><a href="#" @click.prevent="startGotoPage">Page</a></legend>
                <template v-for="page in getPages()">
                    <template v-if="page !== '...'">
                        <template v-if="page === currentPage">
                            <span :class="{ 'ml-0_25': page > 1 }" style="border: 1px solid var(--border-color); padding: 0px 3px;">{{ page }}</span>
                        </template>
                        <a href="#" :class="{ 'ml-0_25': page > 1 }" style="border: 1px solid transparent; padding: 0px 3px;" @click.prevent="changePage(page)" v-else>{{ page }}</a>
                    </template>
                    <template v-else>
                        <span class="ml-1">...</span>
                    </template>
                </template>
            </fieldset>
            <fieldset>
                <legend>Whole result</legend>
                <label>
                    <input type="checkbox" value="1" class="vertical-align-middle" v-model="selectAllRows" />
                    {{ new Intl.NumberFormat().format(totalRows) }}  {{ totalRows > 1 ? 'rows' : 'row' }}
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
                    <button class="ml-1" :disabled="(selectAllRows ? totalRows : selectedRowIds.length) === 0" @click="deleteRows">Delete</button>
                </div>
            </fieldset>
            <fieldset>
                <legend>
                    Export <span>({{ new Intl.NumberFormat().format(selectedRowIds.length === 0 ? totalRows : (selectAllRows ? totalRows : selectedRowIds.length)) }})</span>
                </legend>
                <div>
                    <select v-model="exportAction">
                        <option value="save">save</option>
                        <option value="open">open</option>
                        <!-- <option value="gz">gzip</option> -->
                    </select>
                    <select class="ml-1" style="width: 53px" v-model="exportType">
                        <option value="sql">SQL</option>
                        <option value="sql+create">SQL + CREATE</option>
                        <option value="csv">CSV,</option>
                        <option value="csv;">CSV;</option>
                        <!-- <option value="tsv">TSV</option> -->
                    </select>
                    <button class="ml-1" @click="exportSelected">Export</button>
                </div>
            </fieldset>
        </footer>
    </div>
</template>

<script setup>
import { onBeforeMount, onBeforeUnmount, ref, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from '../store.js'
import { storeToRefs } from 'pinia'
import * as api from '../libs/api.js'
import * as config from '../libs/config.js'
import { highlight } from 'sql-highlight'
import { addQueryParamsToRoute, removeQueryParamsFromRoute } from '../libs/helpers.js'
import Papa from 'papaparse'
import { wrapTableName, wrapColumnName, wrapColumnValue } from '../libs/sql.js'
import { emitter } from '../libs/event-bus'

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
const querySearchInputRef = ref({})
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
const exportAction = ref('save')
const exportType = ref('sql')
const hidePrimaryColumnFromTable = ref(false)
const updateRowColumnValue = ref('')

async function getConnectionTable() {
    const { data: table } = await api.getConnectionTable(route.params.connectionId, route.query.db, route.query.table)
    columns.value = table.columns
    indexes.value = table.indexes
    foreignKeys.value = table.foreignKeys

    let primaryColumnFound = indexes.value.find(index => index.type === 'PRIMARY')

    if(!primaryColumnFound) {
        primaryColumnFound = indexes.value.find(index => index.type === 'UNIQUE')
    }

    if(primaryColumnFound) {
        primaryColumn.value = primaryColumnFound.column

        if(currentConnection.value.type === 'postgresql') {
            const regex = /\((.*)\)/
            const matches = regex.exec(primaryColumn.value)
            if(matches.length === 2) {
                primaryColumn.value  = matches[1]
                if(primaryColumn.value.startsWith('"') && primaryColumn.value.endsWith('"')) {
                    primaryColumn.value = primaryColumn.value.slice(1, -1)
                }
            }
        }
    }
}

function generateQuery(count=false, noLimit=false) {
    const queryParts = ['SELECT']

    const querySelectTemp = querySelect.value.filter(querySelectItem => querySelectItem.column.trim())

    if(!count) {
        if(querySelectTemp.length === 0) {
            queryParts.push('*')
        } else {
            queryParts.push(
                querySelectTemp
                .map(querySelectItem => wrapColumnName(querySelectItem.column, currentConnection.value.type))
                .join(', ')
            )

            // append primary key to query if it's missing from the select, as it's required for a lot of operations
            if(querySelectTemp.some(querySelectItem => querySelectItem.column === primaryColumn.value) === false) {
                queryParts.push(`, ${wrapColumnName(primaryColumn.value, currentConnection.value.type)}`)
                hidePrimaryColumnFromTable.value = true
            } else {
                hidePrimaryColumnFromTable.value = false
            }
        }
    } else {
        queryParts.push('COUNT(*) as count')
    }

    queryParts.push('FROM')

    const tableName = wrapTableName(route.query.table, currentConnection.value.type)

    queryParts.push(tableName)

    const querySearchTemp = querySearch.value.filter(querySearchItem => querySearchItem.column.trim())

    querySearchTemp.forEach((querySearchItem, querySearchItemIndex) => {
        if(querySearchItemIndex === 0) {
            queryParts.push('WHERE')
        } else {
            queryParts.push('AND')
        }

        const column = wrapColumnName(querySearchItem.column, currentConnection.value.type)

        let value = wrapColumnValue(querySearchItem.value, currentConnection.value.type)

        if(querySearchItem.operator === 'IS NOT NULL' || querySearchItem.operator === 'IS NULL') {
            queryParts.push(`${column} ${querySearchItem.operator}`)
        } else if(querySearchItem.operator === 'LIKE %%') {
            const likeValue = wrapColumnValue(`%${querySearchItem.value}%`, currentConnection.value.type)
            queryParts.push(`${column} LIKE ${likeValue}`)
        } else if(querySearchItem.operator === 'IN' || querySearchItem.operator === 'NOT IN') {
            if(querySearchItem.value.startsWith('(') && querySearchItem.value.endsWith(')')) {
                value = querySearchItem.value.slice(1, -1).split(',').map(item => wrapColumnValue(item.trim(), currentConnection.value.type)).join(', ')
            } else {
                value = querySearchItem.value.split(',').map(item => wrapColumnValue(item.trim(), currentConnection.value.type)).join(', ')
            }
            queryParts.push(`${column} ${querySearchItem.operator} (${value})`)
        } else {
            queryParts.push(`${column} ${querySearchItem.operator} ${value}`)
        }
    })

    const querySortTemp = querySort.value.filter(querySortItem => querySortItem.column.trim())

    if(!count) {
        querySortTemp.forEach((querySortItem, querySortItemIndex) => {
            if(querySortItemIndex === 0) {
                queryParts.push('ORDER BY')
            } else {
                queryParts.push(',')
            }

            let column = wrapColumnName(querySortItem.column, currentConnection.value.type)

            queryParts.push(`${column}${querySortItem.descending ? ' DESC' : ''}`)
        })
    }

    if(!count && !noLimit) {
        if(queryLimit.value !== '') {
            queryParts.push(`LIMIT ${queryLimit.value}`)
        }

        if(currentPage.value > 1) {
            queryParts.push(`OFFSET ${(currentPage.value * queryLimit.value) - queryLimit.value}`)
        }
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

function generateColumnData(row, column, foreignKeyMap) {
    let columnData = {}

    if(column.name in foreignKeyMap === false) {
        const text = typeof row[column.name] === 'string' ? row[column.name] : JSON.stringify(row[column.name], null, 4)
        columnData = {
            type: row[column.name] === null ? 'null' : 'text',
            to: '',
            text: row[column.name] === null ? row[column.name] : text.slice(0, 100),
            originalText: row[column.name] === null ? row[column.name] : text,
            originalValue: row[column.name],
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
        columnData = {
            type: row[column.name] === null ? 'null' : 'router-link',
            to: `/${route.params.connectionId}?db=${route.query.db}&table=${foreignKeyMap[column.name].foreign_table}&action=select&filters=${btoa(JSON.stringify(filters))}`,
            text: row[column.name],
            originalText: row[column.name],
            originalValue: row[column.name],
            inputType: column.type.startsWith('json') ? 'textarea' : 'text',
            columnType: column.type
        }
    }

    return columnData
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

    const { success, data } = await api.runQuery(route.params.connectionId, route.query.db, generatedQuery.value)

    if(success) {
        rows.value = data
        rowHeaders.value = rows.value.length > 0 ? Object.keys(rows.value[0]) : []
        if(hidePrimaryColumnFromTable.value) {
            rowHeaders.value = rowHeaders.value.filter(rowHeader => rowHeader !== primaryColumn.value)
        }

        const { data: totalRowsData } = await api.getCount(
            route.params.connectionId,
            route.query.db,
            route.query.table,
            querySearch.value.some(querySearchItem => querySearchItem.column.trim()),
            generateQuery(true)
        )

        totalRows.value = totalRowsData.count

        totalPages.value = queryLimit.value > 0 ? Math.ceil(totalRows.value / queryLimit.value) : 1

        const foreignKeyMap = foreignKeys.value.reduce((prev, curr) => {
            prev[curr.column] = curr
            return prev
        }, {})

        rows.value.forEach(row => {
            columns.value.forEach(column => {
                if(row[column.name] === undefined) {
                    return
                }

                row[column.name] = generateColumnData(row, column, foreignKeyMap)
            })
        })

        queryRan.value = true
    } else {
        error.value = data
        queryRan.value = false
    }
}

function getGeneratedQueryEditRoute() {
    return `/${route.params.connectionId}?db=${route.query.db}&action=query&sql=${encodeURIComponent(generatedQuery.value)}`
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

async function updateRowColumn(row, column) {
    let value = updateRowColumnValue.value

    if(row[column].type === 'text' || row[column].type === 'null' || row[column].columnType === 'uuid') {
        // don't unnecessarily update if the value hasn't changed
        if(row[column].originalText === value) {
            return
        }

        const originalRowColumnColumnType = row[column].type
        const originalRowColumnoriginalText = row[column].originalText
        const originalRowColumntext = row[column].text

        const foreignKeyMap = foreignKeys.value.reduce((prev, curr) => {
            prev[curr.column] = curr
            return prev
        }, {})

        const updatedRowColumn = generateColumnData({
            [column]: value === 'null' ? null : value
        }, columns.value.find(columnItem => columnItem.name === column), foreignKeyMap)

        row[column].type = updatedRowColumn.type
        row[column].to = updatedRowColumn.to
        row[column].text = updatedRowColumn.text
        row[column].originalText = updatedRowColumn.originalText

        const tableName = wrapTableName(route.query.table, currentConnection.value.type)

        const columnName = wrapColumnName(column, currentConnection.value.type)

        const primaryColumnWrapped = wrapColumnName(primaryColumn.value, currentConnection.value.type)

        let valueToUpdate = value

        if(currentConnection.value.type === 'mysql') {
            valueToUpdate = wrapColumnValue(valueToUpdate, currentConnection.value.type)
        }

        if(currentConnection.value.type === 'postgresql') {
            if(row[column].columnType === 'jsonb') {
                valueToUpdate = `'${valueToUpdate.replace(/'/g, "''")}'::jsonb`
            } else {
                if(valueToUpdate === 'null') {
                    valueToUpdate = null
                }
                valueToUpdate = wrapColumnValue(valueToUpdate, currentConnection.value.type)
            }
        }

        const primaryColumnValue =  wrapColumnValue(row[primaryColumn.value].text, currentConnection.value.type)

        error.value = ''

        const { success, data } = await api.runQuery(route.params.connectionId, route.query.db, `UPDATE ${tableName} SET ${columnName} = ${valueToUpdate} WHERE ${primaryColumnWrapped} = ${primaryColumnValue}`)

        if(!success) {
            error.value = data
            // on save failure revert to original value
            // we retain the instant update feel by not updating the data on success
            // we update it in the ui before the actual save, so it seems instantanious
            // but revert to original values on failure (this is less jarring as failure is less likely to happen)
            row[column].type = originalRowColumnColumnType
            row[column].originalText = originalRowColumnoriginalText
            row[column].text = originalRowColumntext
        }
    }
}

function toggleSelectAllRows() {
    if(selectedRowIds.value.length !== rows.value.length) {
        selectedRowIds.value = rows.value.map(row => getSelectedRowId(row))
    } else {
        selectedRowIds.value = []
    }
}

function changePage(page) {
    currentPage.value = page
    runQuery(true)
}

function shouldDisplayPage(page) {
    if(page === 1) {
        return true
    }

    if(currentPage.value - 4 === page) {
        return true
    }

    if(currentPage.value - 3 === page) {
        return true
    }

    if(currentPage.value - 2 === page) {
        return true
    }

    if(currentPage.value - 1 === page) {
        return true
    }

    if(currentPage.value === page) {
        return true
    }

    if(currentPage.value + 1 === page) {
        return true
    }

    if(currentPage.value + 2 === page) {
        return true
    }

    if(currentPage.value + 3 === page) {
        return true
    }

    if(currentPage.value + 4 === page) {
        return true
    }

    if(page === totalPages.value) {
        return true
    }

    return false
}

async function exportSelected() {
    let rowsToExport = []

    if(selectAllRows.value || selectedRowIds.value.length === 0) {
        // warn user if they try to export row count greater than 10,000
        if(totalRows.value > 10000 && !confirm(`Are you sure you want to export ${new Intl.NumberFormat().format(totalRows.value)}?`)) {
            return
        }

        const { data } = await api.runQuery(route.params.connectionId, route.query.db, generateQuery(false, true))
        rowsToExport = data
    } else {
        const { data } = await api.runQuery(route.params.connectionId, route.query.db, generateQuery())
        rowsToExport = data.filter(row => {
            return selectedRowIds.value.some(selectedRowId => {
                let bool = true
                const selectedRowIdColumns = JSON.parse(selectedRowId)
                selectedRowIdColumns.forEach(column => {
                    if(row[column.column] !== column.value) {
                        bool = false
                    }
                })
                return bool
            })
        })
    }

    let textToExport = null

    if(exportType.value.startsWith('csv')) {
        textToExport = Papa.unparse(rowsToExport, {
            delimiter: exportType.value === 'csv' ? ',' : ';'
        })
    }

    if(exportType.value.startsWith('sql')) {
        textToExport = ''

        if(exportType.value === 'sql+create' && currentConnection.value.type === 'mysql') {
            const createStatement = (
                await api.runQuery(route.params.connectionId, route.query.db, `SHOW CREATE TABLE ${wrapTableName(route.query.table)}`)
            ).data[0]['Create Table']
            textToExport += createStatement + ';\n\n'
        }

        let columnsToExport = columns.value.map(column => wrapColumnName(column.name, currentConnection.value.type)).join(', ')
        textToExport += `INSERT INTO ${wrapColumnName(route.query.table, currentConnection.value.type)} (${columnsToExport}) VALUES`
        rowsToExport.forEach((row, rowIndex) => {
            textToExport += '\n('
            textToExport += columns.value.map(column => wrapColumnValue(row[column.name], currentConnection.value.type)).join(',\t')
            textToExport += ')'
            if(rowIndex < rowsToExport.length - 1) {
                textToExport += ','
            } else {
                textToExport += ';\n'
            }
        })
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

            fileName = `${route.query.table}.csv`
        }

        if(exportType.value.startsWith('sql')) {
            blob = new Blob([textToExport], {
                type: 'application/sql;charset=utf-8;'
            })

            fileName = `${route.query.table}.sql`
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

function generateColumnHeaderSortFilter(columnName, descending) {
    const existingSort = querySort.value.find(querySortItem => querySortItem.column === columnName)

    if(existingSort && !existingSort.descending) {
        descending = true
    }

    return [
        {
            column: columnName,
            descending
        }
    ]
}

function generateColumnHeaderSortUrl(columnName, descending) {
    const filters = {
        select: querySelect.value,
        search: querySearch.value,
        sort: generateColumnHeaderSortFilter(columnName, descending),
        limit: queryLimit.value
    }

    return `/${route.params.connectionId}?db=${route.query.db}&table=${route.query.table}&action=select&filters=${btoa(JSON.stringify(filters))}`
}

function handleColumnHeaderSortClick(columnName, descending) {
    querySort.value = generateColumnHeaderSortFilter(columnName, descending)
    runQuery()
}

function addColumnToSearch(columnName) {
    const columnFound = querySearch.value.find(querySearchItem => querySearchItem.column === columnName)

    if(!columnFound) {
        querySearch.value.splice(querySearch.value.length - 1, 0, {
            column: columnName,
            operator: '=',
            value: ''
        })
    }

    nextTick(() => {
        querySearchInputRef.value[columnName].focus()
    })
}

function getPages() {
    const pages = []

    for(let page=1; page<=totalPages.value; page++) {
        if(shouldDisplayPage(page)) {
            pages.push(page)
        } else {
            if(page === 2 || page === totalPages.value - 1) {
                pages.push('...')
            }
        }
    }

    return pages
}

function getSelectedRowId(row) {
    const primaryColumnValue = row[primaryColumn.value]?.originalValue

    let rowIdentifier = []

    if(primaryColumnValue) {
        rowIdentifier.push({
            column: primaryColumn.value,
            value: primaryColumnValue
        })
    } else {
        rowHeaders.value.forEach(rowHeader => {
            rowIdentifier.push({
                column: rowHeader,
                value: row[rowHeader].originalValue
            })
        })
    }

    return JSON.stringify(rowIdentifier)
}

async function deleteRows() {
    const rowRows = selectAllRows.value || selectedRowIds.value.length > 1 ? 'rows' : 'row'

    if(!confirm(`Are you sure you want to delete ${selectAllRows.value ? 'all' : selectedRowIds.value.length} ${rowRows}?`)) {
        return
    }

    if(selectAllRows.value) {
        const { success, data } = await api.runQuery(route.params.connectionId, route.query.db, `DELETE FROM ${wrapTableName(route.query.table, currentConnection.value.type)}`)

        if(!success) {
            alert(`Failed to delete selected rows: ${data}`)
            return
        }
    } else {
        let generatedWhere = ''

        selectedRowIds.value.forEach((selectedRowId, selectedRowIdIndex) => {
            generatedWhere += '('
            const selectedRowIdColumns = JSON.parse(selectedRowId)
            selectedRowIdColumns.forEach((column, columnIndex) => {
                generatedWhere += `${columnIndex > 0 ? ' AND ' : ''}${wrapColumnName(column.column, currentConnection.value.type)} = ${wrapColumnValue(column.value, currentConnection.value.type)}`
            })
            generatedWhere += `)${selectedRowIdIndex < selectedRowIds.value.length - 1 ? ' OR ' : ''}`
        })

        const { success, data } = await api.runQuery(route.params.connectionId, route.query.db, `DELETE FROM ${wrapTableName(route.query.table, currentConnection.value.type)} WHERE ${generatedWhere}`)

        if(!success) {
            alert(`Failed to delete selected rows: ${data}`)
            return
        }
    }

    runQuery()
}

function forceReset() {
    querySelect.value = [
        {
            column: ''
        }
    ]

    querySearch.value = [
        {
            column: '',
            operator: '=',
            value: ''
        }
    ]

    querySort.value = [
        {
            column: '',
            descending: false
        }
    ]

    queryLimit.value = '50'

    currentPage.value = 1

    // we don't specify any query params to remove as the 2nd parameter of this
    // function because route is never aware of the query params we add using
    // addQueryParamsToRoute function, so the query params inside it are
    // exactly what we need here - both "filters" or "page" are absent
    removeQueryParamsFromRoute(route)

    runQuery(false)
}

function handleTableSelectClick(clickedRoute) {
    if(route.fullPath === clickedRoute && clickedRoute !== document.location.pathname + document.location.search) {
        emitter.emit('forceResetTableSelect')
    }
}

function startGotoPage() {
    const page = prompt('Go to page:', currentPage.value)

    if(page === null) {
        return
    }

    if(page === '') {
        return
    }

    if(isNaN(page)) {
        alert('Invalid page number')
        return
    }

    if(page < 1) {
        alert('Page number must be greater than 0')
        return
    }

    if(page > totalPages.value) {
        alert(`Page number must be less than or equal to ${totalPages.value}`)
        return
    }

    currentPage.value = Number(page)
    runQuery(true)
}

const vTextareaFitContent =  {
    mounted(element) {
        element.style.height = element.scrollHeight + 'px'
    }
}

onBeforeMount(async() => {
    exportAction.value = config.get('TableSelectView-ExportAction', exportAction.value)
    exportType.value = config.get('TableSelectView-ExportType', exportType.value)

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

    emitter.on('forceResetTableSelect', forceReset)
})

onBeforeUnmount(() => {
    emitter.off('forceResetTableSelect', forceReset)
})

watch(exportAction, () => {
    config.set('TableSelectView-ExportAction', exportAction.value)
})

watch(exportType, () => {
    config.set('TableSelectView-ExportType', exportType.value)
})
</script>

<style scoped>
.column {
    display: none;
    position: absolute;
    background: #ddf;
    padding: 0.27em 1ex 0.3em 0;
    margin-top: -0.27em;
}

.column-header:hover {
    z-index: 1;
}

.column-header:hover .column, .column:hover {
    display: inline;
}
</style>
