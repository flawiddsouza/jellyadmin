export function wrapTableName(tableName, type) {
    if(type === 'mysql') {
        return `\`${tableName}\``
    }

    if(type === 'postgresql') {
        return `"${tableName}"`
    }

    return tableName
}

export function wrapColumnName(columnName, type) {
    if(type === 'mysql') {
        return `\`${columnName}\``
    }

    if(type === 'postgresql') {
        return `"${columnName}"`
    }

    return columnName
}

export function wrapColumnValue(columnValue, type) {
    if(columnValue === null) {
        return 'NULL'
    }

    if(typeof columnValue === 'number') {
        return columnValue
    }

    if(type === 'mysql') {
        return `'${JSON.stringify(columnValue).slice(1, -1).replace(/'/g, "\\'")}'`
    }

    if(type === 'postgresql') {
        return `'${JSON.stringify(columnValue).slice(1, -1).replace(/'/g, "''")}'`
    }

    return columnValue
}
