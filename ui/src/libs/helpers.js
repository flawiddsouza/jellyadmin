export function addQueryParamsToRoute(route, params) {
    const newParams = {
        ...route.query,
        ...params
    }

    window.history.pushState(
      {},
      null,
      route.path +
        '?' +
        Object.keys(newParams)
        .map(key => {
            return (
                encodeURIComponent(key) + '=' + encodeURIComponent(newParams[key])
            )
        })
        .join('&')
    )
}

export function removeQueryParamsFromRoute(route, paramsToRemove=[]) {
    const newParams = {
        ...route.query
    }

    const newUrl = route.path +
    '?' +
    Object.keys(newParams)
    .filter(param => paramsToRemove.includes(param) === false)
    .map(key => {
        return (
            encodeURIComponent(key) + '=' + encodeURIComponent(newParams[key])
        )
    })
    .join('&')

    window.history.pushState(
      {},
      null,
      newUrl
    )
}

export async function fileToString(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        fileReader.onload = event => resolve(event.target.result)
        fileReader.onerror = error => reject(error)
        fileReader.readAsText(file)
    })
}

export function splitQueries(queryText) {
    const queryString = queryText.trim()

    if(!queryString) {
        return []
    }

    let commaStart = false

    let queries = []
    let currentQuery = ''

    for(let i = 0; i < queryString.length; i++) {
        if(queryString[i] === '\'') {
            commaStart = !commaStart
        }

        if(queryString[i] === ';' && !commaStart) {
            currentQuery = currentQuery.trim()
            if(currentQuery) {
                queries.push(currentQuery)
            }
            currentQuery = ''
        } else {
            currentQuery += queryString[i]
        }
    }

    currentQuery = currentQuery.trim()

    if(currentQuery) {
        queries.push(currentQuery)
    }

    return queries
}
