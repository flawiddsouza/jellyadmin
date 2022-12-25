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
    if(type === 'mysql') {
        return `'${columnValue}'`
    }

    if(type === 'postgresql') {
        return `'${columnValue}'`
    }

    return columnValue
}
