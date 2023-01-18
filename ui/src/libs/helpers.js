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
